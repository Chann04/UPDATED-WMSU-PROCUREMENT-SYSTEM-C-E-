// Database types generated for Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'Faculty' | 'DeptHead' | 'Admin';

export type ProfileStatus = 'Pending' | 'Approved' | 'Declined';

export type RequestStatus = 
  | 'Draft' 
  | 'Pending' 
  | 'Approved' 
  | 'Rejected' 
  | 'ProcurementFailed'
  | 'Procuring'
  | 'ProcurementDone'
  | 'Received' 
  | 'Completed';

export type ActivityAction = 
  | 'created'
  | 'status_changed'
  | 'delegated'
  | 'comment_added';

export type IntegrityEventType =
  | 'submit_locked'
  | 'admin_edit'
  | 'approved_with_reason'
  | 'declined_with_reason'
  | 'procurement_failed_with_reason'
  | 'legacy_backfill';

export type AllocationMode = 'percentage' | 'amount';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          /** Legacy column; omitted after name-parts migration. */
          full_name?: string;
          first_name?: string;
          middle_initial?: string | null;
          family_name?: string;
          email: string;
          role: UserRole;
          department: string | null;
          faculty_department: string | null;
          approved_budget: number | null;
          /** 'Pending' until a College Admin approves the self sign-up. */
          status?: ProfileStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          department?: string | null;
          faculty_department?: string | null;
          approved_budget?: number | null;
          status?: ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department?: string | null;
          faculty_department?: string | null;
          approved_budget?: number | null;
          status?: ProfileStatus;
          updated_at?: string;
        };
      };
      colleges: {
        Row: {
          id: string;
          name: string;
          handler_id: string | null;
          allocation_mode: AllocationMode;
          allocation_value: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          handler_id?: string | null;
          allocation_mode?: AllocationMode;
          allocation_value?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          handler_id?: string | null;
          allocation_mode?: AllocationMode;
          allocation_value?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          contact_number: string | null;
          email: string | null;
          address: string | null;
          category: string | null;
          image_url: string | null;
          status: 'Pending' | 'Qualified' | 'Disqualified';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          updated_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          contact_number: string | null;
          email: string | null;
          address: string | null;
          category: string | null;
          image_url: string | null;
          status: 'Pending' | 'Qualified' | 'Disqualified';
          created_at: string;
          updated_at: string;
          contact_first_name?: string | null;
          contact_middle_name?: string | null;
          contact_last_name?: string | null;
          tin_number?: string | null;
          business_registration_no?: string | null;
          business_type?: string | null;
          portfolio_url?: string | null;
          project_attending?: string | null;
          portfolio_urls?: string[] | null;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          created_at?: string;
          updated_at?: string;
          contact_first_name?: string | null;
          contact_middle_name?: string | null;
          contact_last_name?: string | null;
          tin_number?: string | null;
          business_registration_no?: string | null;
          business_type?: string | null;
          portfolio_url?: string | null;
          project_attending?: string | null;
          portfolio_urls?: string[] | null;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          updated_at?: string;
          contact_first_name?: string | null;
          contact_middle_name?: string | null;
          contact_last_name?: string | null;
          tin_number?: string | null;
          business_registration_no?: string | null;
          business_type?: string | null;
          portfolio_url?: string | null;
          project_attending?: string | null;
          portfolio_urls?: string[] | null;
        };
      };
      budgets: {
        Row: {
          id: string;
          academic_year: string;
          total_amount: number;
          spent_amount: number;
          remaining_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year: string;
          total_amount: number;
          spent_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year?: string;
          total_amount?: number;
          spent_amount?: number;
          updated_at?: string;
        };
      };
      requests: {
        Row: {
          id: string;
          requester_id: string;
          category_id: string | null;
          supplier_id: string | null;
          item_name: string;
          description: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          status: RequestStatus;
          /** Auto-generated when status first transitions to Pending (format: RIS-YYYY-0001). */
          ris_no: string | null;
          /** Auto-generated when status first transitions to Pending (format: SAI-YYYY-0001). */
          sai_no: string | null;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          ordered_at: string | null;
          received_at: string | null;
          completed_at: string | null;
          delegated_to: string | null;
          delegated_by: string | null;
          delegated_at: string | null;
          quotation_url: string | null;
          bid_winner_supplier_id: string | null;
          delivery_notes: string | null;
          delivery_attachment_url: string | null;
          negotiating_notes: string | null;
          budget_fund_source_id: string | null;
          college_budget_type_id: string | null;
          quantity_received: number | null;
          partial_delivery_remarks: string | null;
          requisition_payload: Json | null;
          submitted_payload_hash: string | null;
          latest_payload_hash: string | null;
          integrity_version: number;
          last_integrity_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          category_id?: string | null;
          supplier_id?: string | null;
          item_name: string;
          description?: string | null;
          quantity?: number;
          unit_price: number;
          total_price?: number;
          status?: RequestStatus;
          /** Auto-assigned by the `requests_assign_ris_sai` trigger — do not set from client. */
          ris_no?: string | null;
          /** Auto-assigned by the `requests_assign_ris_sai` trigger — do not set from client. */
          sai_no?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          completed_at?: string | null;
          delegated_to?: string | null;
          delegated_by?: string | null;
          delegated_at?: string | null;
          quotation_url?: string | null;
          bid_winner_supplier_id?: string | null;
          delivery_notes?: string | null;
          delivery_attachment_url?: string | null;
          negotiating_notes?: string | null;
          budget_fund_source_id?: string | null;
          college_budget_type_id?: string | null;
          quantity_received?: number | null;
          partial_delivery_remarks?: string | null;
          requisition_payload?: Json | null;
          submitted_payload_hash?: string | null;
          latest_payload_hash?: string | null;
          integrity_version?: number;
          last_integrity_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          requester_id?: string;
          category_id?: string | null;
          supplier_id?: string | null;
          item_name?: string;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          status?: RequestStatus;
          /** Server-assigned; should not be sent from client. */
          ris_no?: string | null;
          /** Server-assigned; should not be sent from client. */
          sai_no?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          completed_at?: string | null;
          delegated_to?: string | null;
          delegated_by?: string | null;
          delegated_at?: string | null;
          quotation_url?: string | null;
          bid_winner_supplier_id?: string | null;
          delivery_notes?: string | null;
          delivery_attachment_url?: string | null;
          negotiating_notes?: string | null;
          budget_fund_source_id?: string | null;
          college_budget_type_id?: string | null;
          quantity_received?: number | null;
          partial_delivery_remarks?: string | null;
          requisition_payload?: Json | null;
          submitted_payload_hash?: string | null;
          latest_payload_hash?: string | null;
          integrity_version?: number;
          last_integrity_reason?: string | null;
          updated_at?: string;
        };
      };
      request_comments: {
        Row: {
          id: string;
          request_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      request_activity: {
        Row: {
          id: string;
          request_id: string;
          actor_id: string | null;
          action: ActivityAction;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          actor_id?: string | null;
          action: ActivityAction;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          details?: Json | null;
        };
      };
      request_integrity_events: {
        Row: {
          id: string;
          request_id: string;
          event_type: IntegrityEventType;
          actor_id: string | null;
          reason: string | null;
          before_payload: Json | null;
          after_payload: Json | null;
          payload_hash_before: string | null;
          payload_hash_after: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          event_type: IntegrityEventType;
          actor_id?: string | null;
          reason?: string | null;
          before_payload?: Json | null;
          after_payload?: Json | null;
          payload_hash_before?: string | null;
          payload_hash_after?: string | null;
          created_at?: string;
        };
        Update: {
          reason?: string | null;
          before_payload?: Json | null;
          after_payload?: Json | null;
          payload_hash_before?: string | null;
          payload_hash_after?: string | null;
        };
      };
      budget_fund_sources: {
        Row: {
          id: string;
          budget_id: string;
          amount: number;
          funds_for: string | null;
          source: string | null;
          date_received: string | null;
          span: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          amount: number;
          funds_for?: string | null;
          source?: string | null;
          date_received?: string | null;
          span?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          budget_id?: string;
          amount?: number;
          funds_for?: string | null;
          source?: string | null;
          date_received?: string | null;
          span?: string | null;
          updated_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          created_at: string;
          actor_id: string | null;
          event_type: string;
          entity: string | null;
          entity_id: string | null;
          details: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          actor_id?: string | null;
          event_type: string;
          entity?: string | null;
          entity_id?: string | null;
          details?: Json | null;
        };
        Update: {
          actor_id?: string | null;
          event_type?: string;
          entity?: string | null;
          entity_id?: string | null;
          details?: Json | null;
        };
      };
      college_budget_types: {
        Row: {
          id: string;
          college_id: string;
          fund_code: string | null;
          name: string;
          amount: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          college_id: string;
          fund_code?: string | null;
          name: string;
          amount?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          fund_code?: string | null;
          name?: string;
          amount?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      budget_allocation_history: {
        Row: {
          id: string;
          budget_id: string;
          college_id: string;
          dept_head_id: string | null;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          college_id: string;
          dept_head_id?: string | null;
          amount: number;
          created_at?: string;
        };
        Update: {
          dept_head_id?: string | null;
          amount?: number;
        };
      };
      landing_page: {
        Row: {
          section: string;
          data: Json;
          updated_at: string;
        };
        Insert: {
          section: string;
          data?: Json;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          updated_at?: string;
        };
      };
      transparency_seal_entries: {
        Row: {
          id: string;
          created_at: string;
          mission: string | null;
          project_title: string;
          reference_no: string;
          abc: number;
          closing_date: string | null;
          opening_date: string | null;
          location: string | null;
          description: string | null;
          requirements: string[];
          contact_person: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          status: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          mission?: string | null;
          project_title?: string;
          reference_no?: string;
          abc?: number;
          closing_date?: string | null;
          opening_date?: string | null;
          location?: string | null;
          description?: string | null;
          requirements?: string[];
          contact_person?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: string;
          display_order?: number;
        };
        Update: {
          mission?: string | null;
          project_title?: string;
          reference_no?: string;
          abc?: number;
          closing_date?: string | null;
          opening_date?: string | null;
          location?: string | null;
          description?: string | null;
          requirements?: string[];
          contact_person?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: string;
          display_order?: number;
        };
      };
      bid_bulletins: {
        Row: {
          id: string;
          created_at: string;
          type: string;
          status: string;
          title: string;
          reference_no: string;
          date: string | null;
          related_to: string | null;
          description: string | null;
          changes: string[];
          attachments: Json;
          display_order: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          type?: string;
          status?: string;
          title?: string;
          reference_no?: string;
          date?: string | null;
          related_to?: string | null;
          description?: string | null;
          changes?: string[];
          attachments?: Json;
          display_order?: number;
        };
        Update: {
          type?: string;
          status?: string;
          title?: string;
          reference_no?: string;
          date?: string | null;
          related_to?: string | null;
          description?: string | null;
          changes?: string[];
          attachments?: Json;
        };
      };
    };
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      request_submit_atomic: {
        Args: { p_request_id: string };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
      request_approve_with_reason_atomic: {
        Args: { p_request_id: string; p_reason: string; p_college_budget_type_id?: string | null };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
      request_decline_with_reason_atomic: {
        Args: { p_request_id: string; p_reason: string };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
      request_procurement_failed_with_reason_atomic: {
        Args: { p_request_id: string; p_reason: string };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
      request_adjust_with_reason_atomic: {
        Args: {
          p_request_id: string;
          p_description: string;
          p_requisition_payload: Json | null;
          p_quantity: number;
          p_unit_price: number;
          p_reason: string;
          p_status?: string | null;
        };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type College = Database['public']['Tables']['colleges']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type Budget = Database['public']['Tables']['budgets']['Row'];
export type Request = Database['public']['Tables']['requests']['Row'];
export type RequestComment = Database['public']['Tables']['request_comments']['Row'];
export type RequestActivity = Database['public']['Tables']['request_activity']['Row'];
export type RequestIntegrityEvent = Database['public']['Tables']['request_integrity_events']['Row'];
export type BudgetFundSource = Database['public']['Tables']['budget_fund_sources']['Row'];
export type AuditEvent = Database['public']['Tables']['audit_events']['Row'];
export type CollegeBudgetType = Database['public']['Tables']['college_budget_types']['Row'];
export type BudgetAllocationHistory = Database['public']['Tables']['budget_allocation_history']['Row'];

// Extended types with relations
export type RequestWithRelations = Request & {
  requester?: Profile;
  category?: Category;
  supplier?: Supplier;
  college_budget_type?: CollegeBudgetType;
  delegated_to_profile?: Profile;
  bid_winner_supplier?: Supplier;
};

export type CommentWithAuthor = RequestComment & {
  author?: Profile;
};

export type ActivityWithActor = RequestActivity & {
  actor?: Profile;
};

export type IntegrityEventWithActor = RequestIntegrityEvent & {
  actor?: Profile;
};

// Landing page (admin-editable content)
export type LandingBiddingRow = {
  projectTitle: string;
  abc: number;
  referenceNo: string;
  closingDate: string;
};
export type LandingDocumentItem = {
  title: string;
  description: string;
  url: string;
  category: string;
};
/** Single featured procurement item (matches mock data structure) for Transparency Seal */
export type TransparencyFeaturedItem = {
  projectTitle: string;
  referenceNo: string;
  abc: number;
  closingDate: string;
  openingDate?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
};

/** Single saved transparency seal entry (mission + featured item); id set when loaded from DB */
export type TransparencySealEntry = {
  id?: string;
  mission?: string;
  featuredItem?: TransparencyFeaturedItem;
};

/** Row from transparency_seal_entries table (snake_case) */
export type TransparencySealEntryRow = {
  id: string;
  created_at: string;
  mission: string | null;
  project_title: string;
  reference_no: string;
  abc: number;
  closing_date: string | null;
  opening_date: string | null;
  location: string | null;
  description: string | null;
  requirements: string[];
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  display_order: number;
};

export type LandingTransparency = {
  mission?: string;
  featuredItem?: TransparencyFeaturedItem;
  /** List of saved entries; newest appended when user clicks "Add transparency seal" */
  items?: TransparencySealEntry[];
};
export type LandingBidding = { rows: LandingBiddingRow[] };
export type LandingDocuments = { items: LandingDocumentItem[] };

/** Single APP planned item (admin adds these; shown on annual-procurement-plan by month) */
export type AppPlannedItem = {
  projectTitle: string;
  description: string;
  budget: number;
  month: number; // 0 = January, 11 = December
};

export type LandingPlanning = {
  appItems?: AppPlannedItem[];
  pmr?: { title?: string; description?: string; url?: string };
};
export type LandingVendor = {
  accreditationTitle: string;
  accreditationDescription: string;
  accreditationUrl: string;
  loginTitle: string;
  loginDescription: string;
  loginUrl: string;
  /** Extra quick links shown in Vendor Corner */
  links?: { label: string; url: string; description?: string }[];
};
export type LandingBac = {
  secretariatName: string;
  secretariatEmail: string;
  secretariatPhone: string;
  officeAddress: string;
  officeNote: string;
};
export type LandingContent = {
  transparency?: LandingTransparency;
  bidding?: LandingBidding;
  documents?: LandingDocuments;
  planning?: LandingPlanning;
  vendor?: LandingVendor;
  bac?: LandingBac;
};

/** Single bid bulletin attachment (name + url) */
export type BidBulletinAttachment = { name: string; url: string };

/** Bid bulletin for Supplemental / Bid Bulletins (admin form + public list) */
export type BidBulletin = {
  id?: string;
  type: string;
  status: string;
  title: string;
  referenceNo: string;
  date: string;
  relatedTo?: string;
  description?: string;
  changes: string[];
  attachments: BidBulletinAttachment[];
};

/** Row from bid_bulletins table */
export type BidBulletinRow = {
  id: string;
  created_at: string;
  type: string;
  status: string;
  title: string;
  reference_no: string;
  date: string | null;
  related_to: string | null;
  description: string | null;
  changes: string[];
  attachments: BidBulletinAttachment[];
  display_order: number;
};

