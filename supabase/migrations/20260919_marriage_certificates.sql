-- ==========================================
-- Migration: Marriage Certificate Applications
-- Date: 2026-09-19
-- ==========================================

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

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_marriage_cert_house_id ON public.marriage_certificates(house_id);
CREATE INDEX IF NOT EXISTS idx_marriage_cert_status ON public.marriage_certificates(status);
CREATE INDEX IF NOT EXISTS idx_marriage_cert_submitted ON public.marriage_certificates(submitted_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.marriage_certificates ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read marriage_certificates" ON public.marriage_certificates FOR SELECT TO authenticated USING (true);

-- Allow insert/update to authenticated users
CREATE POLICY "Allow insert marriage_certificates" ON public.marriage_certificates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update marriage_certificates" ON public.marriage_certificates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete marriage_certificates" ON public.marriage_certificates FOR DELETE TO authenticated USING (true);
