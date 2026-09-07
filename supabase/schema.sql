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
