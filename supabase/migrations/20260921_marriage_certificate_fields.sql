-- ==============================================================================
-- Migration: Add detailed fields to marriage_certificates matching official record
-- Date: 2026-09-21
-- ==============================================================================

-- 1. Husband / Groom additional record fields
ALTER TABLE public.marriage_certificates
    ADD COLUMN IF NOT EXISTS husband_father_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS husband_house_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS husband_post_office VARCHAR(100),
    ADD COLUMN IF NOT EXISTS husband_taluk VARCHAR(100),
    ADD COLUMN IF NOT EXISTS husband_district VARCHAR(100) DEFAULT 'MALAPPURAM',
    ADD COLUMN IF NOT EXISTS husband_state VARCHAR(100) DEFAULT 'KERALA';

-- 2. Wife / Bride additional record fields
ALTER TABLE public.marriage_certificates
    ADD COLUMN IF NOT EXISTS wife_house_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS wife_post_office VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wife_taluk VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wife_district VARCHAR(100) DEFAULT 'MALAPPURAM',
    ADD COLUMN IF NOT EXISTS wife_state VARCHAR(100) DEFAULT 'KERALA';

-- 3. Nikah ceremony location / venue
ALTER TABLE public.marriage_certificates
    ADD COLUMN IF NOT EXISTS nikah_venue VARCHAR(255);

-- 4. Make legacy fields optional/nullable to match current official certificate format
ALTER TABLE public.marriage_certificates ALTER COLUMN husband_dob DROP NOT NULL;
ALTER TABLE public.marriage_certificates ALTER COLUMN wife_dob DROP NOT NULL;
ALTER TABLE public.marriage_certificates ALTER COLUMN wife_initial DROP NOT NULL;
ALTER TABLE public.marriage_certificates ALTER COLUMN wife_address DROP NOT NULL;

