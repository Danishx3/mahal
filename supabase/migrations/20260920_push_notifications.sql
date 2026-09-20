-- ==========================================
-- Migration: Push Notification Subscriptions & History
-- Date: 2026-09-20
-- ==========================================

-- 1. Push Subscriptions Table
-- Stores browser web push endpoints and VAPID keys per device/role
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning fast targeted lookups
CREATE INDEX IF NOT EXISTS idx_push_subs_role ON public.push_subscriptions(role);
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_house_id ON public.push_subscriptions(house_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow reading subscriptions
CREATE POLICY "Allow read push_subscriptions" ON public.push_subscriptions
    FOR SELECT TO anon, authenticated USING (true);

-- Allow inserting or upserting subscriptions from client devices
CREATE POLICY "Allow insert push_subscriptions" ON public.push_subscriptions
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow updating subscriptions
CREATE POLICY "Allow update push_subscriptions" ON public.push_subscriptions
    FOR UPDATE TO anon, authenticated USING (true);

-- Allow deleting subscriptions when unsubscribing
CREATE POLICY "Allow delete push_subscriptions" ON public.push_subscriptions
    FOR DELETE TO anon, authenticated USING (true);


-- 2. Optional Notification History Log Table
-- Logs dispatched notifications for in-app notification centers / audit trails
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    event_type VARCHAR(100) NOT NULL,
    recipient_role VARCHAR(20) DEFAULT 'resident' CHECK (recipient_role IN ('resident', 'admin', 'all')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_house_id ON public.notifications(house_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON public.notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert notifications" ON public.notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update notifications" ON public.notifications FOR UPDATE TO authenticated USING (true);
