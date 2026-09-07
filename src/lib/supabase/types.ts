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
