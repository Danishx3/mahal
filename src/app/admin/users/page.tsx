'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '@/lib/data-service';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Search,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Home,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface UserDirectoryItem {
  id: string;
  email: string;
  role: 'admin' | 'resident';
  status: string;
  created_at: string;
  house?: {
    id: string;
    house_name: string;
    house_number: string;
    mahallu_reg_no: string;
    division: string;
    phone: string;
  } | null;
}

export default function AdminUsersManagementPage() {
  const { user: currentUser } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const { toast } = useToast();

  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'resident'>('all');

  // Role Change Modal state
  const [targetUser, setTargetUser] = useState<UserDirectoryItem | null>(null);
  const [targetRole, setTargetRole] = useState<'admin' | 'resident'>('admin');
  const [rolePassword, setRolePassword] = useState('');
  const [showRolePassword, setShowRolePassword] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Security Password Reset Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetOtp, setResetOtp] = useState('');
  const [newSecPassword, setNewSecPassword] = useState('');
  const [confirmSecPassword, setConfirmSecPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Load users
  const loadUsers = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await DataService.getAllUsersAsync();
      setUsers(data || []);
    } catch (err: any) {
      toast(err?.message || (isMl ? 'ഉപയോക്താക്കളെ ലഭിക്കുന്നതിൽ തടസ്സം' : 'Failed to fetch users'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const emailMatch = u.email?.toLowerCase().includes(q);
      const houseMatch = u.house?.house_name?.toLowerCase().includes(q);
      const regMatch = u.house?.mahallu_reg_no?.toLowerCase().includes(q);
      const houseNoMatch = u.house?.house_number?.toLowerCase().includes(q);
      const phoneMatch = u.house?.phone?.toLowerCase().includes(q);

      return emailMatch || houseMatch || regMatch || houseNoMatch || phoneMatch;
    });
  }, [users, roleFilter, searchQuery]);

  // Metrics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const residentCount = users.filter((u) => u.role === 'resident').length;

  // Open role change dialog
  const handleOpenRoleModal = (target: UserDirectoryItem, newRole: 'admin' | 'resident') => {
    setTargetUser(target);
    setTargetRole(newRole);
    setRolePassword('');
    setRoleError(null);
    setRoleModalOpen(true);
  };

  // Submit role change
  const handleConfirmRoleChange = async () => {
    if (!targetUser) return;
    if (!rolePassword.trim()) {
      setRoleError(isMl ? 'സുരക്ഷാ പാസ്‌വേഡ് നൽകുക (പ്രാരംഭം: 123123)' : 'Please enter the security password (default: 123123)');
      return;
    }

    setUpdatingRole(true);
    setRoleError(null);

    try {
      const result = await DataService.updateUserRoleAsync(targetUser.id, targetRole, rolePassword.trim());

      toast(result.message || (isMl ? 'റോൾ വിജയകരമായി മാറ്റി!' : 'Role Updated Successfully'), 'success');

      setRoleModalOpen(false);
      setRolePassword('');
      loadUsers(true);
    } catch (err: any) {
      setRoleError(err?.message || (isMl ? 'റോൾ മാറ്റാൻ കഴിഞ്ഞില്ല. പാസ്‌വേഡ് ശരിയാണോ എന്ന് പരിശോധിക്കുക.' : 'Failed to change role.'));
    } finally {
      setUpdatingRole(false);
    }
  };

  // Open Password Reset Modal
  const handleOpenResetModal = () => {
    setResetModalOpen(true);
    setResetStep('request');
    setResetOtp('');
    setNewSecPassword('');
    setConfirmSecPassword('');
    setResetError(null);
  };

  // Step 1: Request OTP email
  const handleRequestOtp = async () => {
    setResettingPassword(true);
    setResetError(null);

    try {
      const res = await DataService.requestSecurityPasswordResetAsync();
      toast(res.message || (isMl ? 'റീസെറ്റ് കോഡ് അയച്ചു!' : 'Reset Code Sent!'), 'success');
      setResetStep('verify');
    } catch (err: any) {
      setResetError(err?.message || (isMl ? 'ഒ.ടി.പി അയക്കാൻ കഴിഞ്ഞില്ല' : 'Failed to send OTP'));
    } finally {
      setResettingPassword(false);
    }
  };

  // Step 2: Verify OTP & Update Password
  const handleVerifyAndUpdatePassword = async () => {
    if (!resetOtp.trim()) {
      setResetError(isMl ? 'ഇമെയിലിൽ ലഭിച്ച ഒ.ടി.പി കോഡ് നൽകുക' : 'Please enter the OTP code');
      return;
    }
    if (!newSecPassword.trim()) {
      setResetError(isMl ? 'പുതിയ പാസ്‌വേഡ് നൽകുക' : 'Please enter new password');
      return;
    }
    if (newSecPassword.trim().length < 4) {
      setResetError(isMl ? 'പാസ്‌വേഡിന് ചുരുങ്ങിയത് 4 അക്ഷരങ്ങൾ വേണം' : 'Password must be at least 4 characters');
      return;
    }
    if (newSecPassword !== confirmSecPassword) {
      setResetError(isMl ? 'പാസ്‌വേഡുകൾ പരസ്പരം പൊരുത്തപ്പെടുന്നില്ല' : 'Passwords do not match');
      return;
    }

    setResettingPassword(true);
    setResetError(null);

    try {
      const res = await DataService.verifySecurityPasswordResetAsync(resetOtp.trim(), newSecPassword.trim());
      toast(res.message || (isMl ? 'പാസ്‌വേഡ് വിജയകരമായി മാറ്റി!' : 'Password Changed Successfully'), 'success');
      setResetModalOpen(false);
    } catch (err: any) {
      setResetError(err?.message || (isMl ? 'പാസ്‌വേഡ് മാറ്റാൻ കഴിഞ്ഞില്ല' : 'Failed to reset password'));
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit">
            <ShieldCheck className="h-4 w-4" />
            <span>{isMl ? 'അഡ്മിൻ കൺസോൾ • യൂസർ അക്സസ്' : 'Admin Console • Access Control'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isMl ? 'ഉപയോക്താക്കളും റോൾ മാനേജ്‌മെന്റും' : 'Users & Role Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {isMl
              ? 'മഹല്ല് പോർട്ടലിൽ രജിസ്റ്റർ ചെയ്ത എല്ലാ അംഗങ്ങളുടെയും വിവരങ്ങൾ കാണുക, റോൾ അഡ്മിനായി ഉയർത്തുക അല്ലെങ്കിൽ മാറ്റുക.'
              : 'Directory of all authenticated community members, with role promotion/demotion and security controls.'}
          </p>
        </div>

        {/* Top Header Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsers(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isMl ? 'പുതുക്കുക' : 'Refresh'}</span>
          </Button>

          <Button
            onClick={handleOpenResetModal}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <KeyRound className="h-4 w-4 text-amber-400" />
            <span>{isMl ? 'സുരക്ഷാ പാസ്‌വേഡ് മാറ്റുക' : 'Change Security Password'}</span>
          </Button>
        </div>
      </div>

      {/* ═══════════ SUMMARY METRICS ═══════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isMl ? 'ആകെ ഉപയോക്താക്കൾ' : 'Total Users'}
            </p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{totalUsers}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isMl ? 'രജിസ്റ്റർ ചെയ്ത മൊത്തം അക്കൗണ്ടുകൾ' : 'Total registered accounts'}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              {isMl ? 'അഡ്മിനിസ്ട്രേറ്റർമാർ' : 'Administrators'}
            </p>
            <h3 className="text-3xl font-black text-emerald-800 mt-1">{adminCount}</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              {isMl ? 'പൂർണ്ണ നിയന്ത്രണമുള്ളവർ' : 'Full access privileges'}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isMl ? 'റെസിഡന്റുകൾ' : 'Residents'}
            </p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{residentCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isMl ? 'മഹല്ല് നിവാസികൾ' : 'Standard resident accounts'}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ═══════════ SEARCH & FILTER TOOLBAR ═══════════ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isMl ? 'പേര്, ഇമെയിൽ, വീട്ടുപേര് തിരയുക...' : 'Search name, email, house...'}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isMl ? `എല്ലാവരും (${totalUsers})` : `All (${totalUsers})`}
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === 'admin'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {isMl ? `അഡ്മിൻമാർ (${adminCount})` : `Admins (${adminCount})`}
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('resident')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === 'resident'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isMl ? `റെസിഡന്റുകൾ (${residentCount})` : `Residents (${residentCount})`}
          </button>
        </div>
      </div>

      {/* ═══════════ USER LISTING DIRECTORY ═══════════ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">
              {isMl ? 'ഉപയോക്താക്കളുടെ വിവരങ്ങൾ ശേഖരിക്കുന്നു...' : 'Loading users directory...'}
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center space-y-3 px-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {isMl ? 'ഉപയോക്താക്കളെ കണ്ടെത്തിയില്ല' : 'No users found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isMl ? 'തിരഞ്ഞെടുത്ത ഫിൽട്ടർ അല്ലെങ്കിൽ സെർച്ച് ക്വറി അനുസരിച്ച് വിവരങ്ങൾ ലഭ്യമല്ല.' : 'No members match the current filter or search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">{isMl ? 'ഉപയോക്താവ്' : 'User / Household'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'മഹല്ല് വിവരങ്ങൾ' : 'Mahallu Info'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'റോൾ' : 'Role'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'രജിസ്റ്റർ ചെയ്തത്' : 'Registered'}</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">{isMl ? 'നടപടികൾ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const houseName = u.house?.house_name || (u.role === 'admin' ? (isMl ? 'അഡ്മിനിസ്ട്രേറ്റർ' : 'Administrator') : (isMl ? 'കുടുംബാംഗം' : 'Member'));
                  const initialLetter = (houseName[0] || u.email[0] || 'U').toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* User / Household */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              u.role === 'admin'
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {u.role === 'admin' ? <ShieldCheck className="h-4.5 w-4.5" /> : initialLetter}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate">{houseName}</p>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                                  {isMl ? 'നിങ്ങൾ' : 'You'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{u.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Mahallu Info */}
                      <td className="py-3.5 px-4">
                        {u.house ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-slate-800 font-semibold">
                              <Home className="h-3 w-3 text-emerald-600" />
                              <span>{u.house.house_number} ({u.house.mahallu_reg_no})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 capitalize">
                              {u.house.division.replace('_', ' ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {isMl ? 'കുടുംബ വിവരങ്ങൾ ചേർത്തിട്ടില്ല' : 'No house linked'}
                          </span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{isMl ? 'അഡ്മിൻ' : 'Admin'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                            <span>{isMl ? 'റെസിഡന്റ്' : 'Resident'}</span>
                          </span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>
                            {new Date(u.created_at).toLocaleDateString(isMl ? 'ml-IN' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {u.role === 'resident' ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenRoleModal(u, 'admin')}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs text-xs font-bold gap-1.5"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
                            <span>{isMl ? 'അഡ്മിനാക്കുക' : 'Make Admin'}</span>
                          </Button>
                        ) : isSelf ? (
                          <span className="text-[11px] text-slate-400 italic">
                            {isMl ? 'സ്വന്തം റോൾ' : 'Current Admin'}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRoleModal(u, 'resident')}
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold gap-1.5"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-rose-500" />
                            <span>{isMl ? 'റെസിഡന്റാക്കുക' : 'Remove Admin'}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════ MODAL 1: ROLE CHANGE PASSWORD CONFIRMATION ═══════════ */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => {
          if (!updatingRole) setRoleModalOpen(false);
        }}
        title={
          targetRole === 'admin'
            ? isMl
              ? '🛡️ അഡ്മിൻ പദവി നൽകുക'
              : 'Promote to Administrator'
            : isMl
            ? '👤 റെസിഡന്റ് പദവിയിലേക്ക് മാറ്റുക'
            : 'Demote to Resident'
        }
        description={
          isMl
            ? 'ഈ ഉപയോക്താവിന്റെ റോൾ മാറ്റുന്നതിന് സുരക്ഷാ പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക.'
            : 'Confirm security password to authorize user role privilege changes.'
        }
        maxWidth="md"
      >
        <div className="space-y-5 pt-2">
          {/* Target User Summary Card */}
          {targetUser && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">
                  {targetUser.house?.house_name || targetUser.email}
                </p>
                <p className="text-slate-500 text-[11px] truncate">{targetUser.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  {isMl ? 'പുതിയ റോൾ' : 'Target Role'}
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold mt-0.5 ${
                    targetRole === 'admin'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {targetRole === 'admin' ? (isMl ? 'അഡ്മിൻ' : 'Admin') : (isMl ? 'റെസിഡന്റ്' : 'Resident')}
                </span>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">
                {isMl ? 'സുരക്ഷാ പാസ്‌വേഡ് സ്ഥിരീകരണം' : 'Security Password Confirmation'}
              </p>
              <p className="text-[11.5px] text-amber-800 mt-0.5">
                {isMl
                  ? 'റോൾ മാറ്റാൻ അഡ്മിൻ സെക്യൂരിറ്റി പാസ്‌വേഡ് നൽകുക. (പ്രാരംഭ ഡിഫോൾട്ട് പാസ്‌വേഡ്: 123123)'
                  : 'Enter the admin security password to authorize this role change (Default: 123123).'}
              </p>
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              {isMl ? 'സുരക്ഷാ പാസ്‌വേഡ് നൽകുക' : 'Enter Security Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showRolePassword ? 'text' : 'password'}
                value={rolePassword}
                onChange={(e) => {
                  setRolePassword(e.target.value);
                  setRoleError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRoleChange();
                }}
                placeholder={isMl ? 'സുരക്ഷാ പാസ്‌വേഡ് (ഉദാ: 123123)' : 'Security password (e.g. 123123)'}
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowRolePassword(!showRolePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showRolePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {roleError && (
              <p className="text-[11px] font-bold text-rose-600 animate-in fade-in-50">
                {roleError}
              </p>
            )}
          </div>

          {/* Reset link helper */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setRoleModalOpen(false);
                handleOpenResetModal();
              }}
              className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              {isMl ? 'പാസ്‌വേഡ് മാറ്റണോ? ഇമെയിൽ വഴി റീസെറ്റ് ചെയ്യുക ➔' : 'Need to change password? Reset via email ➔'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleModalOpen(false)}
              disabled={updatingRole}
              className="rounded-xl"
            >
              {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
            </Button>

            <Button
              size="sm"
              onClick={handleConfirmRoleChange}
              disabled={updatingRole || !rolePassword.trim()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs font-bold gap-2"
            >
              {updatingRole ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{isMl ? 'സ്ഥിരീകരിക്കുന്നു...' : 'Authorizing...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{isMl ? 'റോൾ മാറ്റം സ്ഥിരീകരിക്കുക' : 'Confirm Role Change'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ MODAL 2: SECURITY PASSWORD RESET VIA EMAIL ═══════════ */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => {
          if (!resettingPassword) setResetModalOpen(false);
        }}
        title={isMl ? '🔐 സുരക്ഷാ പാസ്‌വേഡ് മാറ്റുക' : 'Reset Security Password'}
        description={
          isMl
            ? 'ലോഗിൻ ചെയ്ത അഡ്മിൻ ഇമെയിലിലേക്ക് ഒ.ടി.പി കോഡ് അയച്ച് പുതിയ പാസ്‌വേഡ് സജ്ജമാക്കാം.'
            : 'Reset the role-change security password via email OTP verification.'
        }
        maxWidth="md"
      >
        <div className="space-y-5 pt-2">
          {resetStep === 'request' ? (
            /* STEP 1: REQUEST OTP */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Mail className="h-4 w-4 text-emerald-600" />
                  <span>{isMl ? 'അഡ്മിൻ ഇമെയിൽ വിലാസം' : 'Admin Email Address'}</span>
                </div>
                <p className="text-slate-600 font-mono bg-white p-2 rounded-xl border border-slate-200 text-xs">
                  {currentUser?.email || (isMl ? 'ഇമെയിൽ ലഭ്യമായില്ല' : 'No email detected')}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isMl
                    ? 'മേൽക്കാണിച്ച ഇമെയിൽ വിലാസത്തിലേക്ക് 6-അക്ക വെരിഫിക്കേഷൻ ഒ.ടി.പി കോഡ് അയക്കുന്നതാണ് (സാധുത: 15 മിനിറ്റ്).'
                    : 'A 6-digit one-time verification code will be dispatched to your logged-in administrator email (valid 15 minutes).'}
                </p>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-bold">
                  {resetError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetModalOpen(false)}
                  disabled={resettingPassword}
                  className="rounded-xl"
                >
                  {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleRequestOtp}
                  disabled={resettingPassword || !currentUser?.email}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs font-bold gap-2"
                >
                  {resettingPassword ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{isMl ? 'കോഡ് അയക്കുന്നു...' : 'Sending Code...'}</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5 text-emerald-300" />
                      <span>{isMl ? 'ഇമെയിലിലേക്ക് ഒ.ടി.പി അയക്കുക' : 'Send OTP to My Email'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: VERIFY OTP AND ENTER NEW PASSWORD */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{isMl ? 'ഒ.ടി.പി കോഡ് അയച്ചിട്ടുണ്ട്!' : 'OTP Code Dispatched!'}</span>
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {isMl
                    ? `${currentUser?.email} എന്ന ഇമെയിലിൽ ലഭിച്ച 6-അക്ക കോഡ് ഇവിടെ രേഖപ്പെടുത്തുക.`
                    : `Check your inbox at ${currentUser?.email} and enter the 6-digit code below.`}
                </p>
              </div>

              {/* OTP Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  {isMl ? '6-അക്ക ഒ.ടി.പി കോഡ്' : '6-Digit OTP Code'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetOtp}
                  onChange={(e) => {
                    setResetOtp(e.target.value.replace(/\D/g, ''));
                    setResetError(null);
                  }}
                  placeholder="123456"
                  className="w-full px-3 py-2 text-center text-lg font-black tracking-widest rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                  autoFocus
                />
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  {isMl ? 'പുതിയ സുരക്ഷാ പാസ്‌വേഡ്' : 'New Security Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newSecPassword}
                    onChange={(e) => {
                      setNewSecPassword(e.target.value);
                      setResetError(null);
                    }}
                    placeholder={isMl ? 'പുതിയ പാസ്‌വേഡ് നൽകുക...' : 'Enter new password...'}
                    className="w-full px-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  {isMl ? 'പുതിയ പാസ്‌വേഡ് വീണ്ടും നൽകുക' : 'Confirm New Password'}
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmSecPassword}
                  onChange={(e) => {
                    setConfirmSecPassword(e.target.value);
                    setResetError(null);
                  }}
                  placeholder={isMl ? 'സ്ഥിരീകരിക്കാൻ വീണ്ടും ടൈപ്പ് ചെയ്യുക...' : 'Re-type to confirm...'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              {resetError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-bold">
                  {resetError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={resettingPassword}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  {isMl ? 'ഒ.ടി.പി വീണ്ടും അയക്കുക' : 'Resend OTP Code'}
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetModalOpen(false)}
                    disabled={resettingPassword}
                    className="rounded-xl"
                  >
                    {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleVerifyAndUpdatePassword}
                    disabled={resettingPassword || !resetOtp.trim() || !newSecPassword.trim()}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs font-bold gap-2"
                  >
                    {resettingPassword ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{isMl ? 'പുതുക്കുന്നു...' : 'Updating...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                        <span>{isMl ? 'പാസ്‌വേഡ് മാറ്റുക' : 'Set New Password'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
