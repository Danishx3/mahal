'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/client';
import { DataService } from '@/lib/data-service';
import type { Profile, House, HouseWithDetails, UserRole, ProfileStatus } from '@/lib/supabase/types';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  house: HouseWithDetails | House | null;
  role: UserRole | null;
  status: ProfileStatus | null;
  isAdmin: boolean;
  isResident: boolean;
  isApproved: boolean;
  isPending: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [house, setHouse] = useState<HouseWithDetails | House | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile & house for authenticated user
  const syncUserState = useCallback(async (currentUser: User) => {
    setUser(currentUser);

    // 1. Instant local read for snappy UI and offline support
    const localHouse = DataService.getHouseByUserId(currentUser.id);
    if (localHouse) {
      setHouse(localHouse);
      if (localHouse.profile) {
        setProfile(localHouse.profile);
      }
    }

    // 2. Sync with Supabase database if configured
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data: profileData } = (await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()) as { data: Profile | null };

        // 3. Fetch associated house with family members & dues
        const { data: houseData } = (await supabase
          .from('houses')
          .select('*, family_members(*), payment_dues(*)')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()) as { data: HouseWithDetails | null };

        // Determine effective status: do not revert a locally approved house back to pending
        const effectiveStatus: ProfileStatus =
          localHouse?.profile?.status === 'approved'
            ? 'approved'
            : (profileData?.status || localHouse?.profile?.status || 'approved');

        const resolvedProfile: Profile = {
          id: currentUser.id,
          email: currentUser.email || profileData?.email || localHouse?.profile?.email || '',
          role: (profileData?.role || localHouse?.profile?.role || 'resident') as UserRole,
          status: effectiveStatus,
          created_at: profileData?.created_at || localHouse?.created_at || new Date().toISOString(),
        };

        setProfile(resolvedProfile);

        if (houseData) {
          houseData.profile = resolvedProfile;
          houseData.family_members = houseData.family_members || [];
          houseData.payment_dues = houseData.payment_dues || [];
          setHouse(houseData);
          DataService.saveHouseToStorage(houseData);
        } else if (localHouse) {
          localHouse.profile = resolvedProfile;
          setHouse(localHouse);
        }
      } catch (err) {
        console.warn('Profile sync warning:', err);
      }
    } else {
      // Local sync if Supabase is unconfigured
      if (localHouse) {
        setHouse(localHouse);
        if (localHouse.profile) {
          setProfile(localHouse.profile);
        }
      }
    }
  }, []);

  // Initial session loader
  const loadInitialSession = useCallback(async () => {
    // Purge any stale demo session keys from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('mahallu_auth_session_v2');
        localStorage.removeItem('mahallu_auth_session_v1');
        localStorage.removeItem('mahallu_demo_role_v1');
      } catch {
        // Handled
      }
    }

    if (!hasSupabaseConfig()) {
      setUser(null);
      setProfile(null);
      setHouse(null);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth
        .getUser()
        .catch(() => ({ data: { user: null }, error: null }));

      if (data?.user) {
        await syncUserState(data.user);
      } else {
        setUser(null);
        setProfile(null);
        setHouse(null);
      }
    } catch (err) {
      console.warn('Initial session check:', err);
      setUser(null);
      setProfile(null);
      setHouse(null);
    } finally {
      setIsLoading(false);
    }
  }, [syncUserState]);

  useEffect(() => {
    loadInitialSession();

    // Supabase auth subscription
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            await syncUserState(session.user);
          } else {
            setUser(null);
            setProfile(null);
            setHouse(null);
          }
          setIsLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch {
        // Handled
      }
    }
  }, [loadInitialSession, syncUserState]);

  // Listen to live data changes (e.g. admin approves house)
  useEffect(() => {
    const handleDataUpdated = () => {
      if (user?.id) {
        const localHouse = DataService.getHouseByUserId(user.id);
        if (localHouse) {
          setHouse(localHouse);
          if (localHouse.profile) {
            setProfile(localHouse.profile);
          }
        }
      }
    };

    window.addEventListener('mahallu_data_updated', handleDataUpdated);
    return () => {
      window.removeEventListener('mahallu_data_updated', handleDataUpdated);
    };
  }, [user?.id]);

  const signOut = async () => {
    setIsLoading(true);
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setUser(null);
    setProfile(null);
    setHouse(null);
    setIsLoading(false);
    router.push('/auth/login');
  };

  const refreshProfile = async () => {
    if (user) {
      await syncUserState(user);
    }
  };

  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);
  const role = profile?.role || (effectiveHouse as any)?.profile?.role || null;
  const status =
    (effectiveHouse as any)?.profile?.status === 'approved' || profile?.status === 'approved'
      ? 'approved'
      : (profile?.status || (effectiveHouse as any)?.profile?.status || null);
  const isAdmin = role === 'admin';
  const isResident = role === 'resident';
  const isApproved = status === 'approved';
  const isPending = !isApproved && (status === 'pending_verification' || (effectiveHouse as any)?.profile?.status === 'pending_verification');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        house,
        role,
        status,
        isAdmin,
        isResident,
        isApproved,
        isPending,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
