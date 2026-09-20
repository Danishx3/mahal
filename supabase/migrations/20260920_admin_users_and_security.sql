-- ==============================================================================
-- Migration: Admin Users Directory & Security Password Settings
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_security_settings (
    id INT PRIMARY KEY DEFAULT 1,
    role_change_password TEXT NOT NULL DEFAULT '123123',
    reset_otp TEXT,
    reset_otp_expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial row with default password '123123' if not present
INSERT INTO public.admin_security_settings (id, role_change_password, updated_at)
VALUES (1, '123123', NOW())
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.admin_security_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated administrators can access security settings
DROP POLICY IF EXISTS "Admins have full access to admin security settings" ON public.admin_security_settings;
CREATE POLICY "Admins have full access to admin security settings"
    ON public.admin_security_settings FOR ALL
    USING (public.is_admin());
