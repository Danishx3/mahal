'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationPrompt() {
  const pathname = usePathname();
  const { user, profile, isAdmin, house } = useAuth();
  const { toast } = useToast();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      if (Notification.permission === 'default') {
        const dismissedUntil = localStorage.getItem('push_prompt_dismissed_until');
        if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
          setShowPrompt(true);
        }
      } else if (Notification.permission === 'granted') {
        // Silently ensure subscription is up-to-date with current role and user ID
        syncExistingSubscription();
      }
    }
  }, [user?.id, isAdmin, house?.id]);

  const syncExistingSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      let existingSub = await registration.pushManager.getSubscription();

      if (!existingSub && Notification.permission === 'granted') {
        const vapidKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
          'BKGn6-SUJfj7OLkaeMvUM0gis1q65xtbhrmtMIQKgIVVggMAMOBr4ouguEMFyq-hQ9v1b9L_ttt57ZoeAKJYaCI';
        const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
        try {
          existingSub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        } catch (subErr) {
          console.warn('[PushNotificationPrompt] Silent subscribe error:', subErr);
        }
      }

      if (existingSub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: existingSub.toJSON(),
            role: isAdmin ? 'admin' : 'resident',
            userId: user?.id,
            houseId: house?.id,
          }),
        });
      }
    } catch (e) {
      // Non-blocking
    }
  };

  const handleSubscribe = async () => {
    if (!isSupported) {
      toast('Push notifications are not supported by this browser.', 'error');
      return;
    }

    setIsSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast('Notification permission was not granted.', 'info');
        setShowPrompt(false);
        return;
      }

      // Ensure service worker is registered
      let reg: ServiceWorkerRegistration;
      if (navigator.serviceWorker.controller) {
        reg = await navigator.serviceWorker.ready;
      } else {
        reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BKGn6-SUJfj7OLkaeMvUM0gis1q65xtbhrmtMIQKgIVVggMAMOBr4ouguEMFyq-hQ9v1b9L_ttt57ZoeAKJYaCI';

      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // Send to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          role: isAdmin ? 'admin' : 'resident',
          userId: user?.id,
          houseId: house?.id,
        }),
      });

      if (res.ok) {
        toast('🔔 Push notifications enabled successfully! You will receive instant updates.', 'success');
        setShowPrompt(false);
      } else {
        toast('Permission granted, but failed to register device with server.', 'error');
      }
    } catch (err: any) {
      console.error('[PushNotificationPrompt] Subscription error:', err);
      toast(err?.message || 'Failed to enable push notifications.', 'error');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Suppress prompt for 3 days
    localStorage.setItem(
      'push_prompt_dismissed_until',
      String(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );
  };

  // Only display on authenticated portals (admin or dashboard)
  const isTargetPage = pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');
  if (!isSupported || !showPrompt || permission !== 'default' || !isTargetPage) {
    return null;
  }

  const isAdminView = pathname.startsWith('/admin') || isAdmin;

  return (
    <aside
      aria-label="Push Notification Banner"
      className="fixed top-16 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="bg-emerald-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">
                {isAdminView ? 'Enable Admin Push Alerts' : 'Enable Instant Notifications'}
              </h4>
              <p className="text-[11px] text-emerald-100/80 leading-relaxed mt-0.5">
                {isAdminView
                  ? 'Receive instant mobile & desktop alerts when residents submit payments, register households, or request certificates.'
                  : 'Get notified instantly when your dues are verified, certificates are approved, or new collection drives are published.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 text-emerald-400/70 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-800/60">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:text-white hover:bg-emerald-900/50 transition-all cursor-pointer"
          >
            Maybe Later
          </button>
          <button
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>{isSubscribing ? 'Enabling...' : 'Enable Now'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
