-- ==============================================================================
-- Mahallu / Village Management System - PostgreSQL Schema Migration
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUMS AND CUSTOM TYPES
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE division_enum AS ENUM (
        'alungal',
        'prammal',
        'kayanikkara',
        'mariyad',
        'meenamkuzhiyil_south',
        'meenamkuzhiyil_north'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE profile_status_enum AS ENUM (
        'pending_verification',
        'approved',
        'rejected',
        'blocked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM (
        'pending',
        'under_review',
        'verified',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM (
        'credit',
        'debit'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE marital_status_enum AS ENUM (
        'single',
        'married',
        'widowed',
        'divorced'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLES
-- ------------------------------------------------------------------------------

-- Table 1: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
    status profile_status_enum NOT NULL DEFAULT 'pending_verification',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: houses
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    house_name VARCHAR(120) NOT NULL,
    house_number VARCHAR(50) NOT NULL,
    mahallu_reg_no VARCHAR(100) NOT NULL UNIQUE,
    division division_enum NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 3: family_members
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_head_of_family BOOLEAN NOT NULL DEFAULT false,
    relationship VARCHAR(50) NOT NULL,
    marital_status marital_status_enum NOT NULL,
    job_status VARCHAR(100) NOT NULL,
    general_education VARCHAR(100) NOT NULL,
    religious_education VARCHAR(100) NOT NULL,
    age INT CHECK (age >= 0 AND age <= 130),
    phone VARCHAR(20)
);

-- Table 4: payment_dues
CREATE TABLE IF NOT EXISTS public.payment_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    billing_month VARCHAR(7) NOT NULL, -- Format 'YYYY-MM'
    amount NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    transaction_ref VARCHAR(100) UNIQUE,
    status payment_status_enum NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    CONSTRAINT unique_house_month UNIQUE(house_id, billing_month)
);

-- Table 5: financial_ledger
CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type transaction_type_enum NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    payment_due_id UUID REFERENCES public.payment_dues(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_houses_division ON public.houses(division);
CREATE INDEX IF NOT EXISTS idx_houses_user_id ON public.houses(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_house_id ON public.family_members(house_id);
CREATE INDEX IF NOT EXISTS idx_payment_dues_house_id ON public.payment_dues(house_id);
CREATE INDEX IF NOT EXISTS idx_payment_dues_status ON public.payment_dues(status);
CREATE INDEX IF NOT EXISTS idx_payment_dues_billing_month ON public.payment_dues(billing_month);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_created_at ON public.financial_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_type ON public.financial_ledger(type);

-- ------------------------------------------------------------------------------
-- 4. HELPER FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- Helper: Check if the current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$;

-- Trigger Function: Auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        'resident',
        'pending_verification'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger Function: Automatically post a credit to financial_ledger when payment is verified
CREATE OR REPLACE FUNCTION public.handle_payment_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_house_reg_no VARCHAR(100);
BEGIN
    IF (NEW.status = 'verified' AND (OLD.status IS DISTINCT FROM 'verified')) THEN
        -- Lookup house registration number for clear ledger audit trail
        SELECT mahallu_reg_no INTO v_house_reg_no
        FROM public.houses
        WHERE id = NEW.house_id;

        INSERT INTO public.financial_ledger (
            type,
            category,
            amount,
            description,
            payment_due_id,
            created_by,
            created_at
        ) VALUES (
            'credit',
            'House Monthly Due',
            NEW.amount,
            CONCAT('Monthly Dues - Month: ', NEW.billing_month, ' | House: ', COALESCE(v_house_reg_no, 'N/A'), ' | Ref: ', COALESCE(NEW.transaction_ref, 'N/A')),
            NEW.id,
            NEW.verified_by,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_verified ON public.payment_dues;
CREATE TRIGGER on_payment_verified
    AFTER UPDATE ON public.payment_dues
    FOR EACH ROW EXECUTE FUNCTION public.handle_payment_verified();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
CREATE POLICY "Users can update own basic profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- Houses Policies
DROP POLICY IF EXISTS "Residents can view own house" ON public.houses;
CREATE POLICY "Residents can view own house"
    ON public.houses FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Residents can insert own house" ON public.houses;
CREATE POLICY "Residents can insert own house"
    ON public.houses FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Residents can update own house" ON public.houses;
CREATE POLICY "Residents can update own house"
    ON public.houses FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to houses" ON public.houses;
CREATE POLICY "Admins have full access to houses"
    ON public.houses FOR ALL
    USING (public.is_admin());

-- Family Members Policies
DROP POLICY IF EXISTS "Residents can view own family members" ON public.family_members;
CREATE POLICY "Residents can view own family members"
    ON public.family_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.houses
            WHERE houses.id = family_members.house_id
              AND (houses.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Residents can insert own family members" ON public.family_members;
CREATE POLICY "Residents can insert own family members"
    ON public.family_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.houses
            WHERE houses.id = family_members.house_id
              AND (houses.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Residents can update own family members" ON public.family_members;
CREATE POLICY "Residents can update own family members"
    ON public.family_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.houses
            WHERE houses.id = family_members.house_id
              AND (houses.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Residents can delete own family members" ON public.family_members;
CREATE POLICY "Residents can delete own family members"
    ON public.family_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.houses
            WHERE houses.id = family_members.house_id
              AND (houses.user_id = auth.uid() OR public.is_admin())
        )
    );

-- Payment Dues Policies
DROP POLICY IF EXISTS "Residents can view own dues" ON public.payment_dues;
CREATE POLICY "Residents can view own dues"
    ON public.payment_dues FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.houses
            WHERE houses.id = payment_dues.house_id
              AND (houses.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Residents can insert own dues" ON public.payment_dues;
CREATE POLICY "Residents can insert own dues"
    ON public.payment_dues FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.houses
            WHERE houses.id = payment_dues.house_id
              AND (houses.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Residents can submit payment reference" ON public.payment_dues;
CREATE POLICY "Residents can submit payment reference"
    ON public.payment_dues FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.houses
            WHERE houses.id = payment_dues.house_id
              AND houses.user_id = auth.uid()
        )
    )
    WITH CHECK (
        status IN ('pending', 'under_review')
    );

DROP POLICY IF EXISTS "Admins have full access to payment dues" ON public.payment_dues;
CREATE POLICY "Admins have full access to payment dues"
    ON public.payment_dues FOR ALL
    USING (public.is_admin());

-- Financial Ledger Policies
DROP POLICY IF EXISTS "Admins can manage financial ledger" ON public.financial_ledger;
CREATE POLICY "Admins can manage financial ledger"
    ON public.financial_ledger FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Residents can view ledger entries related to their dues" ON public.financial_ledger;
CREATE POLICY "Residents can view ledger entries related to their dues"
    ON public.financial_ledger FOR SELECT
    USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.payment_dues
            JOIN public.houses ON houses.id = payment_dues.house_id
            WHERE payment_dues.id = financial_ledger.payment_due_id
              AND houses.user_id = auth.uid()
        )
    );

-- ==========================================
-- 6. Payment Requests & Campaigns
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Donation',
    amount_type VARCHAR(20) NOT NULL CHECK (amount_type IN ('fixed', 'custom')),
    fixed_amount NUMERIC(12, 2),
    min_amount NUMERIC(12, 2),
    suggested_amount NUMERIC(12, 2),
    target_total NUMERIC(12, 2),
    target_audience VARCHAR(50) DEFAULT 'all',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 7. Payment Request Contributions
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_request_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'under_review' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected')),
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 8. Profile Updates (Verification Queue)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profile_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mahallu_reg_no VARCHAR(100) NOT NULL,
    current_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    requested_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_members JSONB NOT NULL DEFAULT '[]'::jsonb,
    requested_members JSONB NOT NULL DEFAULT '[]'::jsonb,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ==========================================
-- 9. UPI Settings (Single-Row Configuration)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.upi_settings (
    id INT PRIMARY KEY DEFAULT 1,
    upi_id VARCHAR(255) NOT NULL,
    payee_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    ifsc_code VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 10. Dues Settings (Single-Row Configuration)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dues_settings (
    id INT PRIMARY KEY DEFAULT 1,
    default_amount NUMERIC(10, 2) NOT NULL DEFAULT 100,
    current_amount NUMERIC(10, 2) NOT NULL DEFAULT 100,
    scheduled_amount NUMERIC(10, 2),
    scheduled_effective_month VARCHAR(7),
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_request_contributions_req ON public.payment_request_contributions(request_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_contributions_house ON public.payment_request_contributions(house_id);
CREATE INDEX IF NOT EXISTS idx_profile_updates_house_id ON public.profile_updates(house_id);
CREATE INDEX IF NOT EXISTS idx_profile_updates_status ON public.profile_updates(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_request_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read payment_requests" ON public.payment_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read payment_request_contributions" ON public.payment_request_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read profile_updates" ON public.profile_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read upi_settings" ON public.upi_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read dues_settings" ON public.dues_settings FOR SELECT TO authenticated USING (true);

-- Allow write/modify access
CREATE POLICY "Allow write payment_requests" ON public.payment_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write payment_request_contributions" ON public.payment_request_contributions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write profile_updates" ON public.profile_updates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write upi_settings" ON public.upi_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write dues_settings" ON public.dues_settings FOR ALL TO authenticated USING (true);

-- ----------------------------------------------------
-- 8. MARRIAGE CERTIFICATE APPLICATIONS
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marriage_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    mahallu_reg_no VARCHAR(100) NOT NULL,
    house_name VARCHAR(150) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(50) NOT NULL,
    husband_name VARCHAR(150) NOT NULL,
    husband_dob DATE NOT NULL,
    wife_full_name VARCHAR(150) NOT NULL,
    wife_initial VARCHAR(100) NOT NULL,
    wife_father_name VARCHAR(150) NOT NULL,
    wife_address TEXT NOT NULL,
    wife_dob DATE NOT NULL,
    date_of_nikah DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    certificate_number VARCHAR(100),
    admin_notes TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_marriage_cert_house_id ON public.marriage_certificates(house_id);
CREATE INDEX IF NOT EXISTS idx_marriage_cert_status ON public.marriage_certificates(status);
CREATE INDEX IF NOT EXISTS idx_marriage_cert_submitted ON public.marriage_certificates(submitted_at DESC);

ALTER TABLE public.marriage_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read marriage_certificates" ON public.marriage_certificates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write marriage_certificates" ON public.marriage_certificates FOR ALL TO authenticated USING (true);

-- =========================================================================
-- 9. PUSH NOTIFICATIONS & SUBSCRIPTIONS
-- =========================================================================

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

CREATE INDEX IF NOT EXISTS idx_push_subs_role ON public.push_subscriptions(role);
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_house_id ON public.push_subscriptions(house_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read push_subscriptions" ON public.push_subscriptions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert push_subscriptions" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update push_subscriptions" ON public.push_subscriptions FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow delete push_subscriptions" ON public.push_subscriptions FOR DELETE TO anon, authenticated USING (true);

-- Optional Notification History Log Table
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


