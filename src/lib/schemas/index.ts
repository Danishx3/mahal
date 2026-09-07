import { z } from 'zod';

export const divisions = [
  'alungal',
  'prammal',
  'kayanikkara',
  'mariyad',
  'meenamkuzhiyil_south',
  'meenamkuzhiyil_north',
] as const;

export const maritalStatuses = ['single', 'married', 'widowed', 'divorced'] as const;

export const houseSchema = z.object({
  house_name: z
    .string()
    .min(2, 'House name must be at least 2 characters')
    .max(120, 'House name cannot exceed 120 characters'),
  house_number: z
    .string()
    .min(1, 'House number / Ward number is required')
    .max(50, 'House number cannot exceed 50 characters'),
  mahallu_reg_no: z
    .string()
    .min(2, 'Mahallu registration number is required (e.g., MHL-ALU-042)')
    .max(100, 'Registration number cannot exceed 100 characters')
    .regex(/^[A-Za-z0-9\-_/]+$/, 'Only letters, numbers, hyphens, slashes allowed'),
  division: z.enum(divisions, {
    message: 'Please select a valid Mahallu division',
  }),
  phone: z
    .string()
    .min(10, 'Please enter a valid 10-digit primary contact phone number')
    .max(20, 'Phone number cannot exceed 20 characters'),
});

export const familyMemberSchema = z.object({
  name: z
    .string()
    .min(2, 'Member name must be at least 2 characters')
    .max(100, 'Member name cannot exceed 100 characters'),
  is_head_of_family: z.boolean(),
  relationship: z
    .string()
    .min(2, 'Relationship is required (e.g., Self, Wife, Son, Mother)'),
  marital_status: z.enum(maritalStatuses, {
    message: 'Please select a marital status',
  }),
  job_status: z
    .string()
    .min(2, 'Employment status is required (e.g., Employed, Business, Abroad, Student, Homemaker)'),
  general_education: z
    .string()
    .min(2, 'General education is required (e.g., SSLC, Plus Two, Degree, PG)'),
  religious_education: z
    .string()
    .min(2, 'Religious education is required (e.g., Madrasa 10th, Dars, Scholar)'),
  age: z
    .number()
    .int('Age must be an integer')
    .min(0, 'Age cannot be negative')
    .max(130, 'Please enter a realistic age'),
  phone: z.string().optional().or(z.literal('')),
});

export const onboardingSchema = z.object({
  house: houseSchema,
  members: z
    .array(familyMemberSchema)
    .min(1, 'At least one family member (Head of Family) must be added')
    .refine(
      (members) => members.filter((m) => m.is_head_of_family).length === 1,
      'Exactly one member must be marked as Head of Family'
    ),
});

export const paymentSubmissionSchema = z.object({
  billing_month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Billing month must be formatted as YYYY-MM'),
  amount: z.number().min(1, 'Amount must be greater than 0').default(100),
  transaction_ref: z
    .string()
    .min(6, 'Transaction reference / UTR must be at least 6 characters')
    .max(100, 'Reference cannot exceed 100 characters')
    .regex(/^[A-Za-z0-9/_-]+$/, 'Enter valid alphanumeric UPI/UTR transaction ID'),
});

export const ledgerEntrySchema = z.object({
  type: z.enum(['credit', 'debit']),
  category: z.string().min(2, 'Category is required'),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  description: z.string().min(3, 'Detailed description is required'),
});

export const adminRejectionSchema = z.object({
  reason: z.string().min(5, 'Please provide a clear reason (minimum 5 characters)'),
});

export type HouseInput = z.infer<typeof houseSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;
