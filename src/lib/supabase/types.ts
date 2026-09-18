export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Division =
  | 'alungal'
  | 'prammal'
  | 'kayanikkara'
  | 'mariyad'
  | 'meenamkuzhiyil_south'
  | 'meenamkuzhiyil_north';

export const DIVISION_LABELS: Record<Division, string> = {
  alungal: 'Alungal',
  prammal: 'Prammal',
  kayanikkara: 'Kayanikkara',
  mariyad: 'Mariyad',
  meenamkuzhiyil_south: 'Meenamkuzhiyil South',
  meenamkuzhiyil_north: 'Meenamkuzhiyil North',
};

export type ProfileStatus =
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'blocked';

export type PaymentStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'failed';

export type TransactionType = 'credit' | 'debit';

export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced';

export type UserRole = 'resident' | 'admin';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          status: ProfileStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          status?: ProfileStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          status?: ProfileStatus;
          created_at?: string;
        };
      };
      houses: {
        Row: {
          id: string;
          user_id: string;
          house_name: string;
          house_number: string;
          mahallu_reg_no: string;
          division: Division;
          phone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          house_name: string;
          house_number: string;
          mahallu_reg_no: string;
          division: Division;
          phone: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          house_name?: string;
          house_number?: string;
          mahallu_reg_no?: string;
          division?: Division;
          phone?: string;
          created_at?: string;
        };
      };
      family_members: {
        Row: {
          id: string;
          house_id: string;
          name: string;
          is_head_of_family: boolean;
          relationship: string;
          marital_status: MaritalStatus;
          job_status: string;
          general_education: string;
          religious_education: string;
          age: number | null;
          phone: string | null;
        };
        Insert: {
          id?: string;
          house_id: string;
          name: string;
          is_head_of_family?: boolean;
          relationship: string;
          marital_status: MaritalStatus;
          job_status: string;
          general_education: string;
          religious_education: string;
          age?: number | null;
          phone?: string | null;
        };
        Update: {
          id?: string;
          house_id?: string;
          name?: string;
          is_head_of_family?: boolean;
          relationship?: string;
          marital_status?: MaritalStatus;
          job_status?: string;
          general_education?: string;
          religious_education?: string;
          age?: number | null;
          phone?: string | null;
        };
      };
      payment_dues: {
        Row: {
          id: string;
          house_id: string;
          billing_month: string;
          amount: number;
          transaction_ref: string | null;
          status: PaymentStatus;
          submitted_at: string | null;
          verified_at: string | null;
          verified_by: string | null;
          rejection_reason: string | null;
        };
        Insert: {
          id?: string;
          house_id: string;
          billing_month: string;
          amount?: number;
          transaction_ref?: string | null;
          status?: PaymentStatus;
          submitted_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
        };
        Update: {
          id?: string;
          house_id?: string;
          billing_month?: string;
          amount?: number;
          transaction_ref?: string | null;
          status?: PaymentStatus;
          submitted_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
        };
      };
      financial_ledger: {
        Row: {
          id: string;
          type: TransactionType;
          category: string;
          amount: number;
          description: string | null;
          payment_due_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: TransactionType;
          category: string;
          amount: number;
          description?: string | null;
          payment_due_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: TransactionType;
          category?: string;
          amount?: number;
          description?: string | null;
          payment_due_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      payment_requests: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          amount_type: AmountRequestType;
          fixed_amount: number | null;
          min_amount: number | null;
          suggested_amount: number | null;
          target_total: number | null;
          target_audience: string | null;
          status: AmountRequestStatus;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category?: string;
          amount_type: AmountRequestType;
          fixed_amount?: number | null;
          min_amount?: number | null;
          suggested_amount?: number | null;
          target_total?: number | null;
          target_audience?: string | null;
          status?: AmountRequestStatus;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          amount_type?: AmountRequestType;
          fixed_amount?: number | null;
          min_amount?: number | null;
          suggested_amount?: number | null;
          target_total?: number | null;
          target_audience?: string | null;
          status?: AmountRequestStatus;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      payment_request_contributions: {
        Row: {
          id: string;
          request_id: string;
          house_id: string;
          user_id: string | null;
          amount: number;
          transaction_ref: string;
          status: 'pending' | 'under_review' | 'verified' | 'rejected';
          submitted_at: string;
          verified_at: string | null;
          verified_by: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          house_id: string;
          user_id?: string | null;
          amount: number;
          transaction_ref: string;
          status?: 'pending' | 'under_review' | 'verified' | 'rejected';
          submitted_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          house_id?: string;
          user_id?: string | null;
          amount?: number;
          transaction_ref?: string;
          status?: 'pending' | 'under_review' | 'verified' | 'rejected';
          submitted_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
      };
      profile_updates: {
        Row: {
          id: string;
          house_id: string;
          user_id: string;
          mahallu_reg_no: string;
          current_details: Json;
          requested_details: Json;
          current_members: Json;
          requested_members: Json;
          note: string | null;
          status: 'pending' | 'approved' | 'rejected';
          rejection_reason: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          house_id: string;
          user_id: string;
          mahallu_reg_no: string;
          current_details: Json;
          requested_details: Json;
          current_members: Json;
          requested_members: Json;
          note?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          rejection_reason?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          house_id?: string;
          user_id?: string;
          mahallu_reg_no?: string;
          current_details?: Json;
          requested_details?: Json;
          current_members?: Json;
          requested_members?: Json;
          note?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          rejection_reason?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
      };
      upi_settings: {
        Row: {
          id: number;
          upi_id: string;
          payee_name: string;
          bank_name: string | null;
          account_number: string | null;
          ifsc_code: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          upi_id: string;
          payee_name: string;
          bank_name?: string | null;
          account_number?: string | null;
          ifsc_code?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          upi_id?: string;
          payee_name?: string;
          bank_name?: string | null;
          account_number?: string | null;
          ifsc_code?: string | null;
          updated_at?: string;
        };
      };
      dues_settings: {
        Row: {
          id: number;
          default_amount: number;
          current_amount: number;
          scheduled_amount: number | null;
          scheduled_effective_month: string | null;
          history: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          default_amount?: number;
          current_amount?: number;
          scheduled_amount?: number | null;
          scheduled_effective_month?: string | null;
          history?: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          default_amount?: number;
          current_amount?: number;
          scheduled_amount?: number | null;
          scheduled_effective_month?: string | null;
          history?: Json;
          updated_at?: string;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type House = Database['public']['Tables']['houses']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type PaymentDue = Database['public']['Tables']['payment_dues']['Row'];
export type FinancialLedger = Database['public']['Tables']['financial_ledger']['Row'];

export interface HouseWithDetails extends House {
  profile?: Profile;
  family_members: FamilyMember[];
  payment_dues: PaymentDue[];
}

export type AmountRequestType = 'fixed' | 'custom';
export type AmountRequestStatus = 'active' | 'completed' | 'cancelled';

export interface PaymentRequestItem {
  id: string;
  title: string;
  description: string;
  category: string; // e.g., 'Donation', 'Building Fund', 'Mosque Renovation', 'Relief Fund', 'Maintenance', 'Education Aid', 'Festival / Eid', 'Other'
  amount_type: AmountRequestType; // 'fixed' or 'custom' (user pays as they wish)
  fixed_amount?: number;
  min_amount?: number;
  suggested_amount?: number;
  target_total?: number;
  target_audience?: 'all' | Division;
  status: AmountRequestStatus;
  created_at: string;
  created_by?: string;
  due_date?: string | null;
}

export interface PaymentRequestContribution {
  id: string;
  request_id: string;
  house_id: string;
  user_id?: string;
  amount: number;
  transaction_ref: string;
  status: 'under_review' | 'verified' | 'rejected';
  submitted_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export type PaymentRequestRow = Database['public']['Tables']['payment_requests']['Row'];
export type PaymentRequestContributionRow = Database['public']['Tables']['payment_request_contributions']['Row'];
export type ProfileUpdateRow = Database['public']['Tables']['profile_updates']['Row'];
export type UpiSettingsRow = Database['public']['Tables']['upi_settings']['Row'];
export type DuesSettingsRow = Database['public']['Tables']['dues_settings']['Row'];

