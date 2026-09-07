-- ==============================================================================
-- Mahallu / Village Management System - Seed Data
-- ==============================================================================

-- Create demo auth users if using local Supabase auth
-- UUIDs used:
-- Admin: a0000000-0000-0000-0000-000000000001
-- Resident 1 (Approved): b0000000-0000-0000-0000-000000000001
-- Resident 2 (Pending): b0000000-0000-0000-0000-000000000002
-- Resident 3 (Approved): b0000000-0000-0000-0000-000000000003

-- Profiles
INSERT INTO public.profiles (id, email, role, status, created_at)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin@mahallu.org', 'admin', 'approved', NOW() - INTERVAL '60 days'),
    ('b0000000-0000-0000-0000-000000000001', 'ahmed.kutty@gmail.com', 'resident', 'approved', NOW() - INTERVAL '45 days'),
    ('b0000000-0000-0000-0000-000000000002', 'musthafa.v@gmail.com', 'resident', 'pending_verification', NOW() - INTERVAL '2 days'),
    ('b0000000-0000-0000-0000-000000000003', 'fathima.z@gmail.com', 'resident', 'approved', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE 
SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Houses
INSERT INTO public.houses (id, user_id, house_name, house_number, mahallu_reg_no, division, phone, created_at)
VALUES
    ('h0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Baitul Noor', 'VII/142', 'MHL-ALU-042', 'alungal', '+91 98471 23456', NOW() - INTERVAL '45 days'),
    ('h0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Darul Aman', 'IV/89', 'MHL-PRA-118', 'prammal', '+91 94460 78901', NOW() - INTERVAL '2 days'),
    ('h0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Al Rahma', 'XII/05', 'MHL-KAY-204', 'kayanikkara', '+91 99951 45678', NOW() - INTERVAL '30 days')
ON CONFLICT (mahallu_reg_no) DO NOTHING;

-- Family Members
INSERT INTO public.family_members (house_id, name, is_head_of_family, relationship, marital_status, job_status, general_education, religious_education, age, phone)
VALUES
    -- House 1 (Baitul Noor)
    ('h0000000-0000-0000-0000-000000000001', 'Ahmed Kutty', true, 'Self', 'married', 'Business', 'Degree', 'Madrasa 10th', 52, '+91 98471 23456'),
    ('h0000000-0000-0000-0000-000000000001', 'Khadija', false, 'Wife', 'married', 'Homemaker', 'Plus Two', 'Madrasa 10th', 47, '+91 98471 23457'),
    ('h0000000-0000-0000-0000-000000000001', 'Mohammad Bilal', false, 'Son', 'single', 'Abroad', 'B.Tech', 'Madrasa 10th', 24, '+971 50 123 4567'),
    ('h0000000-0000-0000-0000-000000000001', 'Aysha Nihala', false, 'Daughter', 'single', 'Student', 'Degree', 'Islamic Scholar', 20, '+91 98471 23458'),

    -- House 2 (Darul Aman - Pending)
    ('h0000000-0000-0000-0000-000000000002', 'Musthafa V', true, 'Self', 'married', 'Employed', 'Plus Two', 'Madrasa 10th', 43, '+91 94460 78901'),
    ('h0000000-0000-0000-0000-000000000002', 'Suhara', false, 'Wife', 'married', 'Homemaker', 'SSLC', 'Madrasa 7th', 39, '+91 94460 78902'),
    ('h0000000-0000-0000-0000-000000000002', 'Rinshad', false, 'Son', 'single', 'Student', 'SSLC', 'Madrasa 7th', 15, NULL),

    -- House 3 (Al Rahma)
    ('h0000000-0000-0000-0000-000000000003', 'Fathima Z', true, 'Self', 'widowed', 'Homemaker', 'SSLC', 'Madrasa 5th', 61, '+91 99951 45678'),
    ('h0000000-0000-0000-0000-000000000003', 'Shabeer Ali', false, 'Son', 'married', 'Business', 'Degree', 'Dars', 34, '+91 99951 45679');

-- Payment Dues
INSERT INTO public.payment_dues (id, house_id, billing_month, amount, transaction_ref, status, submitted_at, verified_at, verified_by)
VALUES
    -- House 1 dues
    ('d0000000-0000-0000-0000-000000000001', 'h0000000-0000-0000-0000-000000000001', '2026-07', 100.00, 'UPI/20260715/9823412', 'verified', NOW() - INTERVAL '50 days', NOW() - INTERVAL '49 days', 'a0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000002', 'h0000000-0000-0000-0000-000000000001', '2026-08', 100.00, 'UPI/20260814/7712398', 'verified', NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days', 'a0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000003', 'h0000000-0000-0000-0000-000000000001', '2026-09', 100.00, 'UPI/20260905/4456123', 'under_review', NOW() - INTERVAL '2 days', NULL, NULL),

    -- House 3 dues
    ('d0000000-0000-0000-0000-000000000004', 'h0000000-0000-0000-0000-000000000003', '2026-08', 100.00, 'UTR-SBIN20260802-991', 'verified', NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days', 'a0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000005', 'h0000000-0000-0000-0000-000000000003', '2026-09', 100.00, NULL, 'pending', NULL, NULL, NULL)
ON CONFLICT (house_id, billing_month) DO NOTHING;

-- Financial Ledger (Initial Balance and Dues)
INSERT INTO public.financial_ledger (type, category, amount, description, payment_due_id, created_by, created_at)
VALUES
    ('credit', 'Donation', 25000.00, 'Annual Mosque Renovation Donation - Alungal Ward Sponsor', NULL, 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '55 days'),
    ('credit', 'House Monthly Due', 100.00, 'Monthly Dues - Month: 2026-07 | House: MHL-ALU-042 | Ref: UPI/20260715/9823412', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '49 days'),
    ('debit', 'Electricity', 3450.00, 'KSEB Mosque and Madrasa Power Bill - July 2026', NULL, 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '40 days'),
    ('credit', 'House Monthly Due', 100.00, 'Monthly Dues - Month: 2026-08 | House: MHL-KAY-204 | Ref: UTR-SBIN20260802-991', 'd0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '27 days'),
    ('credit', 'House Monthly Due', 100.00, 'Monthly Dues - Month: 2026-08 | House: MHL-ALU-042 | Ref: UPI/20260814/7712398', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '21 days'),
    ('debit', 'Maintenance', 4800.00, 'Azaan Speaker Sound System Repair & Amplifier Replacement', NULL, 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'),
    ('debit', 'Relief Aid', 10000.00, 'Medical emergency financial aid disbursement for dialysis treatment', NULL, 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '8 days'),
    ('credit', 'Donation', 15000.00, 'Special Friday Collection for Madrasa Building Extension', NULL, 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days');
