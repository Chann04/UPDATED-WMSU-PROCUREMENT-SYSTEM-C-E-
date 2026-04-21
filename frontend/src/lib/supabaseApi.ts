import { supabase } from './supabaseClient';
import { normalizeUserRole } from './roles';
import type {
  Profile,
  College,
  CollegeBudgetType,
  Category, 
  Vendor, 
  Budget, 
  BudgetFundSource,
  BudgetAllocationHistory,
  Request, 
  RequestWithRelations,
  RequestStatus,
  ActivityAction,
  IntegrityEventType,
  CommentWithAuthor,
  ActivityWithActor,
  IntegrityEventWithActor,
  AuditEvent,
  LandingContent,
  TransparencySealEntry,
  TransparencySealEntryRow,
  TransparencyFeaturedItem,
  BidBulletin,
  BidBulletinRow,
  BidBulletinAttachment
} from '../types/database';
import { parseRequisitionDescription } from './parseRequisitionDescription';

function withNormalizedRole(p: Profile | null): Profile | null {
  if (!p) return null;
  return { ...p, role: normalizeUserRole(p.role) };
}

// =====================================================
// AUTH API
// =====================================================
export const authAPI = {
  // Sign up with email and password
  signUp: async (
    email: string,
    password: string,
    name: { firstName: string; middleName?: string; lastName: string },
    role: string = 'Faculty',
    department?: string | null
  ) => {
    const firstName = name.firstName.trim();
    const middleName = (name.middleName || '').trim();
    const lastName = name.lastName.trim();
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const canonicalRole = normalizeUserRole(role);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName,
          middle_initial: middleName || null,
          family_name: lastName,
          role: canonicalRole,
          ...(department != null && department !== '' ? { department } : {})
        }
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Reset password (sends password reset email)
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  },

  // Get current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  // Get current user's profile
  getProfile: async (): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return withNormalizedRole(data);
  }
};

// =====================================================
// PROFILES API
// =====================================================
export const profilesAPI = {
  getAll: async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({ ...row, role: normalizeUserRole(row.role) }));
  },

  getById: async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return withNormalizedRole(data);
  },

  update: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
    const payload = { ...updates };
    if (payload.role !== undefined && payload.role !== null) {
      payload.role = normalizeUserRole(payload.role);
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return withNormalizedRole(data);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// REGISTRATION (self sign-up) API
// =====================================================
/**
 * Self sign-up + College-Admin approval workflow.
 *
 * Password safety:
 *   Supabase Auth stores only bcrypt hashes of passwords in the `auth.users`
 *   table; the application never sees or persists the raw value. Even the
 *   WMSU Admin can only reset passwords, never read them.
 */
export const registrationAPI = {
  /**
   * Creates an `auth.users` row with status = 'Pending' metadata.
   * Supabase sends the verification email automatically when the project
   * has email confirmations enabled. The DB trigger (handle_new_user)
   * will mirror the metadata into a `profiles` row with status='Pending'.
   *
   * Returns a normalized shape so the UI can tell whether:
   *   - Supabase sent a verification email (confirmationRequired: true)
   *   - The email was already registered (alreadyRegistered: true)
   *   - Email confirmation is disabled in the Supabase project
   *     (confirmationRequired: false, sessionReturned: true)
   */
  signUp: async (payload: {
    firstName: string;
    middleInitial?: string;
    lastName: string;
    email: string;
    password: string;
    college: string;
    department: string;
    emailRedirectTo?: string;
  }): Promise<{
    confirmationRequired: boolean;
    alreadyRegistered: boolean;
    sessionReturned: boolean;
    raw: unknown;
  }> => {
    const firstName = payload.firstName.trim();
    const middleInitial = (payload.middleInitial || '').trim();
    const lastName = payload.lastName.trim();
    const fullName = [firstName, middleInitial, lastName].filter(Boolean).join(' ');
    const email = payload.email.trim();

    console.log('[registrationAPI.signUp] submitting', {
      email,
      emailRedirectTo: payload.emailRedirectTo,
      college: payload.college,
      department: payload.department,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password: payload.password,
      options: {
        emailRedirectTo: payload.emailRedirectTo,
        data: {
          full_name: fullName,
          first_name: firstName,
          middle_initial: middleInitial || null,
          family_name: lastName,
          role: 'Faculty',
          department: payload.college,
          faculty_department: payload.department,
          registration_status: 'Pending',
        },
      },
    });

    if (error) {
      console.error('[registrationAPI.signUp] supabase error', {
        name: (error as { name?: string }).name,
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
        message: error.message,
      });
      throw error;
    }

    // When Supabase's "Prevent email enumeration" setting is on, a duplicate
    // sign-up returns a user object with an empty `identities` array and no
    // session — no email is sent. Surface that so we can warn the user.
    const identities = (data?.user as { identities?: unknown[] } | null)?.identities;
    const alreadyRegistered = Array.isArray(identities) && identities.length === 0;
    const sessionReturned = Boolean(data?.session);
    // If email confirmations are disabled in the project, Supabase returns a
    // session immediately — meaning no verification email will ever be sent.
    const confirmationRequired = !sessionReturned && !alreadyRegistered;

    console.log('[registrationAPI.signUp] response', {
      confirmationRequired,
      alreadyRegistered,
      sessionReturned,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      emailConfirmedAt: (data?.user as { email_confirmed_at?: string } | null)?.email_confirmed_at,
    });

    return { confirmationRequired, alreadyRegistered, sessionReturned, raw: data };
  },

  /**
   * Re-send the sign-up confirmation email for an address that already has
   * an unconfirmed `auth.users` row.
   */
  resendConfirmation: async (email: string, emailRedirectTo?: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    if (error) {
      console.error('[registrationAPI.resendConfirmation] supabase error', {
        name: (error as { name?: string }).name,
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
        message: error.message,
      });
      throw error;
    }
    console.log('[registrationAPI.resendConfirmation] ok', data);
    return data;
  },

  /** Pending registrations belonging to a specific college (by name). */
  listPendingForCollege: async (collegeName: string): Promise<Profile[]> => {
    if (!collegeName) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'Pending')
      .eq('department', collegeName)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({ ...row, role: normalizeUserRole(row.role) }));
  },

  approve: async (profileId: string): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: 'Approved' })
      .eq('id', profileId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // RLS rejected the write (0 rows affected). Surface a clear message
      // instead of PostgREST's "Cannot coerce the result to a single JSON object".
      throw new Error(
        'You do not have permission to approve this registration. Make sure your College Admin account is assigned to the college the applicant chose.'
      );
    }
    return { ...data, role: normalizeUserRole(data.role) };
  },

  decline: async (profileId: string): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: 'Declined' })
      .eq('id', profileId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error(
        'You do not have permission to decline this registration. Make sure your College Admin account is assigned to the college the applicant chose.'
      );
    }
    return { ...data, role: normalizeUserRole(data.role) };
  },
};

export const profilesQueryAPI = {
  getByRole: async (role: string): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', normalizeUserRole(role))
      .order('email', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => ({ ...row, role: normalizeUserRole(row.role) }));
  },

  getByDepartment: async (department: string): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('department', department)
      .order('email', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => ({ ...row, role: normalizeUserRole(row.role) }));
  }
};

// =====================================================
// COLLEGES API
// =====================================================
/** Canonical list of WMSU colleges. Used by ensureDefaults to back-fill the colleges table. */
export const WMSU_DEFAULT_COLLEGES: string[] = [
  'College of Law',
  'College of Agriculture',
  'College of Liberal Arts',
  'College of Architecture',
  'College of Nursing',
  'College of Asian & Islamic Studies',
  'College of Computing Studies',
  'College of Forestry & Environmental Studies',
  'College of Criminal Justice Education',
  'College of Home Economics',
  'College of Engineering',
  'College of Medicine',
  'College of Public Administration & Development Studies',
  'College of Sports Science & Physical Education',
  'College of Science and Mathematics',
  'College of Social Work & Community Development',
  'College of Teacher Education',
  "Professional Science Master's Program",
];

export const collegesAPI = {
  getAll: async (): Promise<College[]> => {
    const { data, error } = await supabase
      .from('colleges')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Inserts any colleges from WMSU_DEFAULT_COLLEGES that are not already in the table.
   * New colleges are created with no handler (unassigned) so the app-level status
   * resolves to "Not Active" until an admin is linked.
   * Safe to call multiple times — relies on the unique `name` constraint.
   */
  ensureDefaults: async (): Promise<number> => {
    const { data: existing, error: fetchError } = await supabase
      .from('colleges')
      .select('name');
    if (fetchError) throw fetchError;

    const existingNames = new Set((existing || []).map((r) => r.name));
    const missing = WMSU_DEFAULT_COLLEGES.filter((n) => !existingNames.has(n));
    if (missing.length === 0) return 0;

    const payload = missing.map((name) => ({
      name,
      handler_id: null as string | null,
      allocation_mode: 'percentage' as const,
      allocation_value: 0,
      is_active: true,
    }));

    const { error: insertError } = await supabase.from('colleges').insert(payload);
    if (insertError) {
      // Retry without handler_id if the project schema is missing that column.
      if (/handler_id|schema cache/i.test(insertError.message || '')) {
        const retry = payload.map(({ handler_id: _ignored, ...rest }) => rest);
        const { error: retryError } = await supabase.from('colleges').insert(retry);
        if (retryError) throw retryError;
      } else {
        throw insertError;
      }
    }
    return missing.length;
  },

  create: async (payload: {
    name: string;
    handler_id?: string | null;
    allocation_mode: 'percentage' | 'amount';
    allocation_value: number;
    is_active?: boolean;
  }): Promise<College> => {
    const basePayload = {
      ...payload,
      is_active: payload.is_active ?? true,
    };

    let { data, error } = await supabase
      .from('colleges')
      .insert(basePayload)
      .select()
      .single();

    // Backward compatibility: project schema still missing `handler_id`
    if (error && /handler_id|schema cache/i.test(error.message || '')) {
      const { data: retryData, error: retryError } = await supabase
        .from('colleges')
        .insert({
          name: basePayload.name,
          allocation_mode: basePayload.allocation_mode,
          allocation_value: basePayload.allocation_value,
          is_active: basePayload.is_active,
        })
        .select()
        .single();
      data = retryData;
      error = retryError;
    }

    if (error) throw error;
    return data;
  },

  update: async (
    id: string,
    updates: Partial<Pick<College, 'name' | 'handler_id' | 'allocation_mode' | 'allocation_value' | 'is_active'>>
  ): Promise<College> => {
    let { data, error } = await supabase
      .from('colleges')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    // Backward compatibility: project schema still missing `handler_id`
    if (error && /handler_id|schema cache/i.test(error.message || '')) {
      const { handler_id: _ignored, ...withoutHandler } = updates;
      const { data: retryData, error: retryError } = await supabase
        .from('colleges')
        .update(withoutHandler)
        .eq('id', id)
        .select()
        .single();
      data = retryData;
      error = retryError;
    }

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('colleges').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Keeps `colleges.handler_id` in sync when a College Admin (DeptHead) user's assigned college
   * (`profiles.department` = college name) changes from the Users page.
   * Clears this user as handler on all colleges, then assigns them to the row whose `name` matches.
   */
  syncDeptHeadHandlerFromProfile: async (
    userId: string,
    role: string,
    collegeName: string | null | undefined
  ): Promise<void> => {
    const r = normalizeUserRole(role);
    const { error: clearError } = await supabase
      .from('colleges')
      .update({ handler_id: null })
      .eq('handler_id', userId);
    if (clearError) throw clearError;

    if (r !== 'DeptHead') return;
    const name = (collegeName ?? '').trim();
    if (!name) return;

    const { data: college, error: findError } = await supabase
      .from('colleges')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    if (findError) throw findError;
    if (!college?.id) {
      console.warn(`[collegesAPI] No college row with name "${name}" — handler not set.`);
      return;
    }

    await collegesAPI.update(college.id, { handler_id: userId });
  },
};

// =====================================================
// COLLEGE BUDGET TYPES API (DeptHead allocations)
// =====================================================
export const collegeBudgetTypesAPI = {
  getByCollegeId: async (collegeId: string): Promise<CollegeBudgetType[]> => {
    const { data, error } = await supabase
      .from('college_budget_types')
      .select('*')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  create: async (payload: {
    college_id: string;
    fund_code?: string | null;
    name: string;
    amount: number;
    is_active?: boolean;
  }): Promise<CollegeBudgetType> => {
    const { data, error } = await supabase
      .from('college_budget_types')
      .insert({
        ...payload,
        fund_code: payload.fund_code ? String(payload.fund_code).trim() : null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Pick<CollegeBudgetType, 'fund_code' | 'name' | 'amount' | 'is_active'>>): Promise<CollegeBudgetType> => {
    const { data, error } = await supabase
      .from('college_budget_types')
      .update({
        ...updates,
        fund_code: updates.fund_code !== undefined ? (updates.fund_code ? String(updates.fund_code).trim() : null) : undefined,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('college_budget_types').delete().eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// CATEGORIES API
// =====================================================
export const categoriesAPI = {
  getAll: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Category | null> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (category: { name: string; description?: string }): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Category>): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// VENDORS API (keeping for backward compatibility)
// =====================================================
export const vendorsAPI = {
  getAll: async (): Promise<Vendor[]> => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Vendor | null> => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> => {
    const { data, error } = await supabase
      .from('vendors')
      .insert(vendor)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Vendor>): Promise<Vendor> => {
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// SUPPLIERS API (for supplier registration)
// =====================================================
import type { Supplier } from '../types/database';

export const suppliersAPI = {
  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Supplier | null> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// BUDGETS API
// =====================================================
export const budgetsAPI = {
  getAll: async (): Promise<Budget[]> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** Latest budget row = current active allocation session. */
  getLatestSession: async (): Promise<Budget | null> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  getCurrent: async (): Promise<Budget | null> => {
    return budgetsAPI.getLatestSession();
  },

  /** Current budget with "used" = sum of committed pipeline statuses (remaining reflects committed budget) */
  getCurrentWithCommitted: async (): Promise<Budget | null> => {
    const current = await budgetsAPI.getCurrent();
    if (!current) return null;
    const { data: rows } = await supabase
      .from('requests')
      .select('total_price')
      .in('status', ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed']);
    const used = rows?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
    return {
      ...current,
      spent_amount: used,
      remaining_amount: Math.max(0, current.total_amount - used)
    };
  },

  getCurrentYearBudgets: async (): Promise<Budget[]> => {
    const latest = await budgetsAPI.getLatestSession();
    if (!latest) return [];
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('academic_year', latest.academic_year)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Budget | null> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  getByYear: async (year: string): Promise<Budget | null> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('academic_year', year)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  create: async (budget: { academic_year: string; total_amount: number }): Promise<Budget> => {
    return budgetsAPI.createSession(budget);
  },

  /**
   * Starts a new budget allocation session.
   * Rule: remaining balance from previous session is carried over to the new session total.
   */
  createSession: async (budget: { academic_year: string; total_amount: number }): Promise<Budget> => {
    const latest = await budgetsAPI.getLatestSession();
    const carryOver = latest ? Math.max(0, Number(latest.remaining_amount || 0)) : 0;
    const effectiveTotal = Number(budget.total_amount || 0) + carryOver;
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budget, total_amount: effectiveTotal, spent_amount: 0 })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Budget>): Promise<Budget> => {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  upsert: async (budget: { academic_year: string; total_amount: number }): Promise<Budget> => {
    // Preserve old callers: treat upsert as "start new session".
    return budgetsAPI.createSession(budget);
  },

  /** Sum distributed amount for a budget session from append-only allocation history. */
  getDistributedByBudgetId: async (budgetId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('budget_allocation_history')
      .select('amount')
      .eq('budget_id', budgetId);
    if (error) throw error;
    return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  },

  /**
   * Save college allocations for the active session.
   * Rule: only one allocation action is allowed per session.
   * To allocate again, start a new budget session.
   */
  saveCollegeAllocationsForSession: async (
    budgetId: string,
    rows: Array<{ college_id: string; dept_head_id: string; target_amount: number }>
  ): Promise<{
    distributedTotal: number;
    insertedDeltaTotal: number;
    insertedDeltas: Array<{ college_id: string; dept_head_id: string; amount: number }>;
  }> => {
    const { data: currentRows, error: currentError } = await supabase
      .from('budget_allocation_history')
      .select('college_id, amount')
      .eq('budget_id', budgetId);
    if (currentError) throw currentError;

    // Hard business rule: one allocation action only per budget session.
    // If any allocation history already exists for this session, block further allocation saves.
    if ((currentRows || []).length > 0) {
      throw new Error(
        'Allocations were already submitted for this budget session. Add a new budget session to allocate again.'
      );
    }

    const currentByCollege: Record<string, number> = {};
    (currentRows || []).forEach((r) => {
      currentByCollege[r.college_id] = (currentByCollege[r.college_id] || 0) + Number(r.amount || 0);
    });

    let targetTotal = 0;
    const inserts: Array<{ budget_id: string; college_id: string; dept_head_id: string; amount: number }> = [];
    const inputByCollege = new Map<string, { dept_head_id: string; target_amount: number }>();
    for (const row of rows) {
      inputByCollege.set(row.college_id, {
        dept_head_id: row.dept_head_id,
        target_amount: row.target_amount,
      });
    }

    const allCollegeIds = new Set<string>([
      ...Object.keys(currentByCollege),
      ...rows.map((r) => r.college_id),
    ]);

    for (const collegeId of allCollegeIds) {
      const current = currentByCollege[collegeId] || 0;
      const input = inputByCollege.get(collegeId);
      // Critical rule: once allocated in this session, omission must NOT reduce it.
      const target = input ? Math.max(0, Number(input.target_amount || 0)) : current;
      if (target < current) {
        throw new Error(
          `Allocation for this college cannot decrease in the same session (current: ₱${current.toLocaleString()}, target: ₱${target.toLocaleString()}).`
        );
      }
      const delta = Number((target - current).toFixed(2));
      targetTotal += target;
      if (delta > 0) {
        if (!input) {
          throw new Error('Internal allocation mismatch: missing college admin assignment for new allocation delta.');
        }
        inserts.push({
          budget_id: budgetId,
          college_id: collegeId,
          dept_head_id: input.dept_head_id,
          amount: delta
        });
      }
    }

    const budget = await budgetsAPI.getById(budgetId);
    if (!budget) throw new Error('Budget session not found.');
    if (targetTotal > Number(budget.total_amount || 0)) {
      throw new Error(
        `Total distribution (₱${targetTotal.toLocaleString()}) exceeds session budget (₱${Number(budget.total_amount || 0).toLocaleString()}).`
      );
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('budget_allocation_history').insert(inserts);
      if (insertError) throw insertError;
    }

    await budgetsAPI.update(budgetId, { spent_amount: targetTotal });

    return {
      distributedTotal: targetTotal,
      insertedDeltaTotal: inserts.reduce((sum, row) => sum + row.amount, 0),
      insertedDeltas: inserts.map((r) => ({
        college_id: r.college_id,
        dept_head_id: r.dept_head_id,
        amount: r.amount,
      })),
    };
  }
};

export const budgetAllocationHistoryAPI = {
  getByBudgetId: async (
    budgetId: string
  ): Promise<
    Array<
      BudgetAllocationHistory & {
        college?: Pick<College, 'id' | 'name'> | null;
        dept_head?: Profile | null;
      }
    >
  > => {
    const { data, error } = await supabase
      .from('budget_allocation_history')
      .select(
        `
        *,
        college:colleges!college_id(id, name),
        dept_head:profiles!dept_head_id(*)
      `
      )
      .eq('budget_id', budgetId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Array<
      BudgetAllocationHistory & {
        college?: Pick<College, 'id' | 'name'> | null;
        dept_head?: Profile | null;
      }
    >;
  }
};

// =====================================================
// BUDGET FUND SOURCES API (breakdown of where budget came from)
// =====================================================
export const budgetFundSourcesAPI = {
  getByBudgetId: async (budgetId: string): Promise<BudgetFundSource[]> => {
    const { data, error } = await supabase
      .from('budget_fund_sources')
      .select('*')
      .eq('budget_id', budgetId)
      .order('date_received', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  create: async (source: {
    budget_id: string;
    amount: number;
    funds_for?: string | null;
    source?: string | null;
    date_received?: string | null;
    span?: string | null;
  }): Promise<BudgetFundSource> => {
    const { data, error } = await supabase
      .from('budget_fund_sources')
      .insert(source)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Omit<BudgetFundSource, 'id' | 'budget_id' | 'created_at'>>): Promise<BudgetFundSource> => {
    const { data, error } = await supabase
      .from('budget_fund_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('budget_fund_sources').delete().eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// REQUESTS API
// =====================================================
const normalizeText = (v: string | null | undefined) => (v || '').trim();

const canonicalizeRequisitionDescription = (description: string | null | undefined): string => {
  const parsed = parseRequisitionDescription(description);
  if (parsed.kind === 'raw') {
    return JSON.stringify({ kind: 'raw', text: normalizeText(parsed.text) });
  }
  const headerKeys = Object.keys(parsed.header).sort((a, b) => a.localeCompare(b));
  const header = headerKeys.reduce<Record<string, string>>((acc, k) => {
    acc[k] = normalizeText(parsed.header[k]);
    return acc;
  }, {});
  const items = parsed.items.map((it, idx) => ({
    lineNo: idx + 1,
    unit: normalizeText(it.unit),
    item: normalizeText(it.item),
    qty: Number(it.qty || 0),
    unitPrice: Number(it.unitPrice || 0),
  }));
  const signatories = {
    requestedBy: parsed.signatories.requestedBy,
    approvedBy: parsed.signatories.approvedBy,
    issuedBy: parsed.signatories.issuedBy,
    receivedBy: parsed.signatories.receivedBy,
  };
  return JSON.stringify({ kind: 'structured', header, items, signatories });
};

const canonicalizeRequestPayloadForIntegrity = (requestLike: {
  item_name?: string | null;
  description?: string | null;
  requisition_payload?: Record<string, unknown> | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  budget_fund_source_id?: string | null;
  college_budget_type_id?: string | null;
}) =>
  JSON.stringify({
    item_name: normalizeText(requestLike.item_name),
    description: canonicalizeRequisitionDescription(requestLike.description),
    requisition_payload: requestLike.requisition_payload ?? null,
    quantity: Number(requestLike.quantity || 0),
    unit_price: Number(requestLike.unit_price || 0),
    total_price: Number(requestLike.total_price || 0),
    budget_fund_source_id: requestLike.budget_fund_source_id || null,
    college_budget_type_id: requestLike.college_budget_type_id || null,
  });

const sha256Hex = async (text: string): Promise<string> => {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const computeIntegrityHash = async (requestLike: {
  item_name?: string | null;
  description?: string | null;
  requisition_payload?: Record<string, unknown> | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  budget_fund_source_id?: string | null;
  college_budget_type_id?: string | null;
}): Promise<string> => {
  const canonical = canonicalizeRequestPayloadForIntegrity(requestLike);
  return sha256Hex(canonical);
};

export const requestsAPI = {
  getAll: async (filters?: { status?: RequestStatus }): Promise<RequestWithRelations[]> => {
    let query = supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        college_budget_type:college_budget_types!college_budget_type_id(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  getMyRequests: async (): Promise<RequestWithRelations[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        college_budget_type:college_budget_types!college_budget_type_id(*)
      `)
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getByRequesterIds: async (requesterIds: string[]): Promise<RequestWithRelations[]> => {
    if (!requesterIds || requesterIds.length === 0) return [];
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        college_budget_type:college_budget_types!college_budget_type_id(*)
      `)
      .in('requester_id', requesterIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** All requests submitted by department users under the handled college of a DeptHead profile. */
  getForHandledCollege: async (deptHeadProfileId: string): Promise<{
    college: College | null;
    requests: RequestWithRelations[];
  }> => {
    const colleges = await collegesAPI.getAll();
    const handled = colleges.find((c) => c.handler_id === deptHeadProfileId) ?? null;
    if (!handled?.name) {
      return { college: null, requests: [] };
    }
    const deptProfiles = await profilesQueryAPI.getByDepartment(handled.name);
    const requesterIds = deptProfiles.map((p) => p.id);
    const requests = requesterIds.length ? await requestsAPI.getByRequesterIds(requesterIds) : [];
    return { college: handled, requests };
  },

  getPending: async (): Promise<RequestWithRelations[]> => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        college_budget_type:college_budget_types!college_budget_type_id(*)
      `)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /** College admin queue: pending approval through procurement (and Received for visibility). */
  getApprovalsQueue: async (): Promise<RequestWithRelations[]> => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*)
      `)
      .in('status', ['Pending', 'Approved', 'Procuring', 'ProcurementDone', 'Received'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<RequestWithRelations | null> => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        college_budget_type:college_budget_types!college_budget_type_id(*),
        delegated_to_profile:profiles!delegated_to(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  create: async (request: {
    category_id?: string;
    supplier_id?: string;
    item_name: string;
    description?: string;
    requisition_payload?: Record<string, unknown> | null;
    quantity: number;
    unit_price: number;
    status?: RequestStatus;
    budget_fund_source_id?: string | null;
    college_budget_type_id?: string | null;
  }): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // total_price is computed by the database (trigger or generated column), do not send it on insert
    const { data, error } = await supabase
      .from('requests')
      .insert({
        ...request,
        requester_id: user.id,
        status: request.status || 'Draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Record physical delivery: quantity received vs ordered; remarks mandatory if partial. Sets status to Received. */
  recordPartialDelivery: async (
    id: string,
    payload: { quantity_received: number; partial_delivery_remarks?: string | null }
  ): Promise<Request> => {
    const existing = await requestsAPI.getById(id);
    if (!existing) throw new Error('Request not found');
    const receivable: RequestStatus[] = ['ProcurementDone'];
    if (!receivable.includes(existing.status)) {
      throw new Error(
        'Receipt can only be confirmed after procurement is marked done. If this request is still approved or in procuring, wait for your college admin to finish procurement.'
      );
    }
    const qo = Math.max(0, Number(existing.quantity || 0));
    const qr = Math.max(0, Number(payload.quantity_received));
    const remarks = payload.partial_delivery_remarks?.trim() || null;
    if (qr < qo && !remarks) {
      throw new Error('Remarks are required when quantity received is less than quantity ordered.');
    }
    return requestsAPI.update(id, {
      quantity_received: qr,
      partial_delivery_remarks: qr < qo ? remarks : null,
      status: 'Received',
      received_at: new Date().toISOString(),
    });
  },

  update: async (id: string, updates: Partial<Request>): Promise<Request> => {
    const { data, error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Workflow actions
  submit: async (id: string): Promise<Request> => {
    const { data, error } = await supabase.rpc('request_submit_atomic', { p_request_id: id });
    if (error) throw error;
    return data as Request;
  },

  approve: async (id: string): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    return requestsAPI.update(id, { 
      status: 'Approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
  },

  /** Sum total_price already charged to this budget type (approved pipeline only). Pending requests do not count. */
  sumCommittedTotalForBudgetType: async (collegeBudgetTypeId: string): Promise<number> => {
    const committedStatuses: RequestStatus[] = [
      'Approved',
      'Procuring',
      'ProcurementDone',
      'Received',
      'Completed',
    ];
    const { data, error } = await supabase
      .from('requests')
      .select('total_price')
      .eq('college_budget_type_id', collegeBudgetTypeId)
      .in('status', committedStatuses);
    if (error) throw error;
    return (data || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
  },

  /** Approve and assign college sub-category (budget type). Use null for general college pool. */
  approveWithBudgetType: async (id: string, college_budget_type_id: string | null): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    return requestsAPI.update(id, {
      status: 'Approved',
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
      college_budget_type_id,
    });
  },

  reject: async (id: string, reason: string): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Partial<Request> = {
      status: 'Rejected',
      rejection_reason: reason || null,
      approved_at: new Date().toISOString()
    };
    if (user?.id) updates.approved_by = user.id;
    return requestsAPI.update(id, updates);
  },

  rejectWithReason: async (id: string, reason: string): Promise<Request> => {
    const trimmed = reason.trim();
    if (!trimmed) throw new Error('Reason is required to decline a requisition.');
    const { data, error } = await supabase.rpc('request_decline_with_reason_atomic', {
      p_request_id: id,
      p_reason: trimmed,
    });
    if (error) throw error;
    return data as Request;
  },

  /** College admin: approved request is being procured (department confirms receipt only after procurement done). */
  markProcuring: async (id: string): Promise<Request> => {
    const existing = await requestsAPI.getById(id);
    if (!existing) throw new Error('Request not found');
    const updates: Partial<Request> = {
      status: 'Procuring',
    };
    if (!existing.ordered_at) {
      updates.ordered_at = new Date().toISOString();
    }
    return requestsAPI.update(id, updates);
  },

  /** College admin: procurement activity finished; department may confirm receipt. */
  markProcurementDone: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, { status: 'ProcurementDone' });
  },

  /** College admin: procurement failed; treated as terminal outcome like Rejected. */
  markProcurementFailed: async (id: string, reason?: string | null): Promise<Request> => {
    return requestsAPI.update(id, {
      status: 'ProcurementFailed',
      rejection_reason: reason?.trim() || 'Procurement failed.',
    });
  },

  markProcurementFailedWithReason: async (id: string, reason: string): Promise<Request> => {
    const trimmed = reason.trim();
    if (!trimmed) throw new Error('Reason is required when marking procurement as failed.');
    const { data, error } = await supabase.rpc('request_procurement_failed_with_reason_atomic', {
      p_request_id: id,
      p_reason: trimmed,
    });
    if (error) throw error;
    return data as Request;
  },

  markReceived: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, { 
      status: 'Received',
      received_at: new Date().toISOString()
    });
  },

  markDelivering: async (id: string, payload: { bid_winner_supplier_id?: string | null; delivery_notes?: string | null; delivery_attachment_url?: string | null }): Promise<Request> => {
    return requestsAPI.update(id, { 
      status: 'Received',
      received_at: new Date().toISOString(),
      bid_winner_supplier_id: payload.bid_winner_supplier_id ?? null,
      delivery_notes: payload.delivery_notes ?? null,
      delivery_attachment_url: payload.delivery_attachment_url ?? null
    });
  },

  /** Upload optional attachment when marking as Delivering. Uses bucket procurement-documents path delivery-attachments/{requestId}/... */
  uploadDeliveryAttachment: async (requestId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `delivery-attachments/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('procurement-documents').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('procurement-documents').getPublicUrl(data.path);
    return urlData.publicUrl;
  },

  markCompleted: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, { 
      status: 'Completed',
      completed_at: new Date().toISOString()
    });
  },

  // Delegation
  delegate: async (id: string, delegateToId: string): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    return requestsAPI.update(id, { 
      delegated_to: delegateToId,
      delegated_by: user?.id,
      delegated_at: new Date().toISOString()
    });
  },

  approveWithReason: async (id: string, reason: string, collegeBudgetTypeId: string | null = null): Promise<Request> => {
    const trimmed = reason.trim();
    if (!trimmed) throw new Error('Reason is required to approve requisition.');
    const { data, error } = await supabase.rpc('request_approve_with_reason_atomic', {
      p_request_id: id,
      p_reason: trimmed,
      p_college_budget_type_id: collegeBudgetTypeId,
    });
    if (error) throw error;
    return data as Request;
  }
};

export const integrityAPI = {
  computeHash: computeIntegrityHash,

  getTimelineByRequestId: async (requestId: string): Promise<IntegrityEventWithActor[]> => {
    const { data, error } = await supabase
      .from('request_integrity_events')
      .select(`
        *,
        actor:profiles!actor_id(*)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** Request IDs that have at least one admin_edit integrity event (batch). */
  getRequestIdsWithAdminEdit: async (requestIds: string[]): Promise<Set<string>> => {
    if (!requestIds.length) return new Set();
    const { data, error } = await supabase
      .from('request_integrity_events')
      .select('request_id')
      .in('request_id', requestIds)
      .eq('event_type', 'admin_edit');
    if (error) throw error;
    return new Set((data || []).map((row) => row.request_id as string));
  },

  recordEvent: async (payload: {
    requestId: string;
    eventType: IntegrityEventType;
    reason?: string | null;
    beforePayload?: Record<string, unknown> | null;
    afterPayload?: Record<string, unknown> | null;
    payloadHashBefore?: string | null;
    payloadHashAfter?: string | null;
  }): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('request_integrity_events')
      .insert({
        request_id: payload.requestId,
        event_type: payload.eventType,
        actor_id: user.id,
        reason: payload.reason?.trim() || null,
        before_payload: payload.beforePayload ?? null,
        after_payload: payload.afterPayload ?? null,
        payload_hash_before: payload.payloadHashBefore ?? null,
        payload_hash_after: payload.payloadHashAfter ?? null,
      });
    if (error) throw error;
  },

  saveAdjustedWithReason: async (params: {
    requestId: string;
    reason: string;
    beforeRequest: RequestWithRelations;
    afterPatch: Partial<Request>;
    requisitionPayload?: Record<string, unknown> | null;
    beforePayload?: Record<string, unknown> | null;
    afterPayload?: Record<string, unknown> | null;
  }): Promise<Request> => {
    const trimmed = params.reason.trim();
    if (!trimmed) throw new Error('Reason is required for requisition edits.');
    const description = params.afterPatch.description ?? params.beforeRequest.description ?? '';
    const quantity = Number(params.afterPatch.quantity ?? params.beforeRequest.quantity ?? 0);
    const unitPrice = Number(params.afterPatch.unit_price ?? params.beforeRequest.unit_price ?? 0);
    const status = params.afterPatch.status ?? null;

    const { data, error } = await supabase.rpc('request_adjust_with_reason_atomic', {
      p_request_id: params.requestId,
      p_description: description,
      p_requisition_payload: (params.requisitionPayload ?? null) as any,
      p_quantity: quantity,
      p_unit_price: unitPrice,
      p_reason: trimmed,
      p_status: status,
    });
    if (error) throw error;
    return data as Request;
  },
};

/** University → college → unit (sub-category) context for faculty PR validation (doc-aligned). */
export const procurementBudgetAPI = {
  getFacultySnapshot: async (): Promise<{
    college: College | null;
    collegeAdminBudget: number;
    committedCollege: number;
    remainingCollege: number;
    fundSources: BudgetFundSource[];
    budgetTypes: CollegeBudgetType[];
    committedByTypeId: Record<string, number>;
  }> => {
    const profile = await authAPI.getProfile();
    if (!profile) {
      return {
        college: null,
        collegeAdminBudget: 0,
        committedCollege: 0,
        remainingCollege: 0,
        fundSources: [],
        budgetTypes: [],
        committedByTypeId: {},
      };
    }
    const colleges = await collegesAPI.getAll();
    const deptName = profile.department?.trim() || profile.faculty_department?.trim() || '';
    const college = deptName ? colleges.find((c) => c.name === deptName) ?? null : null;

    const fundSources: BudgetFundSource[] = [];
    const yearBudgets = await budgetsAPI.getCurrentYearBudgets();
    for (const b of yearBudgets) {
      const fs = await budgetFundSourcesAPI.getByBudgetId(b.id);
      fundSources.push(...fs);
    }

    if (!college) {
      return {
        college: null,
        collegeAdminBudget: 0,
        committedCollege: 0,
        remainingCollege: 0,
        fundSources,
        budgetTypes: [],
        committedByTypeId: {},
      };
    }

    const budgetTypes = (await collegeBudgetTypesAPI.getByCollegeId(college.id)).filter((t) => t.is_active);
    const deptProfiles = await profilesQueryAPI.getByDepartment(college.name);
    const ids = deptProfiles.map((p) => p.id);
    const rows = ids.length ? await requestsAPI.getByRequesterIds(ids) : [];
    const committedStatuses: RequestStatus[] = [
      'Approved',
      'Procuring',
      'ProcurementDone',
      'Received',
      'Completed',
    ];
    const committedCollege = rows
      .filter((r) => committedStatuses.includes(r.status))
      .reduce((s, r) => s + Number(r.total_price || 0), 0);

    const handler = college.handler_id ? await profilesAPI.getById(college.handler_id) : null;
    const collegeAdminBudget = Number(handler?.approved_budget || 0);
    const remainingCollege = Math.max(0, collegeAdminBudget - committedCollege);

    const committedByTypeId: Record<string, number> = {};
    for (const t of budgetTypes) {
      committedByTypeId[t.id] = 0;
    }
    for (const r of rows) {
      if (!committedStatuses.includes(r.status)) continue;
      const tid = r.college_budget_type_id;
      if (tid && committedByTypeId[tid] !== undefined) {
        committedByTypeId[tid] += Number(r.total_price || 0);
      }
    }

    return {
      college,
      collegeAdminBudget,
      committedCollege,
      remainingCollege,
      fundSources,
      budgetTypes,
      committedByTypeId,
    };
  },
};

// =====================================================
// COMMENTS API
// =====================================================
export const commentsAPI = {
  getByRequestId: async (requestId: string): Promise<CommentWithAuthor[]> => {
    const { data, error } = await supabase
      .from('request_comments')
      .select(`
        *,
        author:profiles!author_id(*)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  create: async (requestId: string, content: string): Promise<CommentWithAuthor> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('request_comments')
      .insert({
        request_id: requestId,
        author_id: user.id,
        content
      })
      .select(`
        *,
        author:profiles!author_id(*)
      `)
      .single();

    if (error) throw error;
    // Keep request activity log aligned with live conversation events.
    await activityAPI.create(requestId, {
      action: 'comment_added',
      details: { comment_id: data.id },
    });
    return data;
  },

  getLatestByRequestIds: async (requestIds: string[]): Promise<Record<string, string>> => {
    if (!requestIds.length) return {};
    const { data, error } = await supabase
      .from('request_comments')
      .select('request_id, created_at')
      .in('request_id', requestIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const out: Record<string, string> = {};
    for (const row of data || []) {
      if (!out[row.request_id]) out[row.request_id] = row.created_at;
    }
    return out;
  },

  uploadAttachment: async (requestId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `request-comments/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('procurement-documents').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('procurement-documents').getPublicUrl(data.path);
    return urlData.publicUrl;
  },
};

// =====================================================
// ACTIVITY API (Audit Trail)
// =====================================================
export const activityAPI = {
  getByRequestId: async (requestId: string): Promise<ActivityWithActor[]> => {
    const { data, error } = await supabase
      .from('request_activity')
      .select(`
        *,
        actor:profiles!actor_id(*)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** All recent request activity (admin audit log). */
  getAllRecent: async (limit = 150): Promise<ActivityWithActor[]> => {
    const { data, error } = await supabase
      .from('request_activity')
      .select(`
        *,
        actor:profiles!actor_id(*),
        request:requests!request_id(id, item_name, status)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  create: async (
    requestId: string,
    payload: { action: ActivityAction; details?: Record<string, unknown> | null }
  ): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('request_activity')
      .insert({
        request_id: requestId,
        actor_id: user.id,
        action: payload.action,
        details: payload.details ?? null,
      });
    if (error) throw error;
  },
};

export const auditAPI = {
  getRecent: async (limit = 200): Promise<(AuditEvent & { actor?: Profile | null })[]> => {
    const { data, error } = await supabase
      .from('audit_events')
      .select(`
        *,
        actor:profiles!actor_id(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },
};

// =====================================================
// DASHBOARD API
// =====================================================
export const dashboardAPI = {
  getStats: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get profile to check role
    const profile = await authAPI.getProfile();
    const isAdminOrDeptHead = profile?.role === 'Admin' || profile?.role === 'DeptHead';

    // Budget: Admin/DeptHead see university budget; Faculty do not receive allocation totals via this API
    let budget: { total: number; spent: number; remaining: number; academicYear: string } | null = null;
    if (isAdminOrDeptHead) {
      const uniBudget = await budgetsAPI.getCurrent();
      if (uniBudget) {
        const { data: committedRequests } = await supabase
          .from('requests')
          .select('total_price')
          .in('status', ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed']);
        const used = committedRequests?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
        budget = {
          total: uniBudget.total_amount,
          spent: used,
          remaining: Math.max(0, uniBudget.total_amount - used),
          academicYear: uniBudget.academic_year
        };
      }
    }

    // Get pending approvals count
    const { count: pendingApprovals } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    // Get request counts by status
    let requestsQuery = supabase
      .from('requests')
      .select('status, created_at');

    if (!isAdminOrDeptHead) {
      requestsQuery = requestsQuery.eq('requester_id', user.id);
    }

    const { data: requestsData } = await requestsQuery;

    const requestsByStatus: Record<string, number> = {};
    if (isAdminOrDeptHead) {
      requestsData?.forEach(r => {
        const status = r.status;
        const key = status ? status.charAt(0).toUpperCase() + (status.slice(1) || '').toLowerCase() : status;
        requestsByStatus[key] = (requestsByStatus[key] || 0) + 1;
      });
    } else {
      // Faculty: only one request at a time in progress; pipeline shows only that current request
      const inProgressStatuses = ['Draft', 'Pending'];
      const sorted = (requestsData || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const currentRequest = sorted.find(r =>
        inProgressStatuses.includes(r.status)
      ) ?? sorted[0];
      if (currentRequest?.status) {
        const key = currentRequest.status.charAt(0).toUpperCase() + (currentRequest.status.slice(1) || '').toLowerCase();
        requestsByStatus[key] = 1;
      }
    }

    // Get monthly spending
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let monthlyQuery = supabase
      .from('requests')
      .select('total_price')
      .in('status', ['Procuring', 'ProcurementDone', 'Received', 'Completed'])
      .gte('updated_at', startOfMonth.toISOString());
    if (!isAdminOrDeptHead) {
      monthlyQuery = monthlyQuery.eq('requester_id', user.id);
    }
    const { data: monthlyData } = await monthlyQuery;
    const monthlySpending = monthlyData?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;

    // Get recent requests (for faculty: only the single current request)
    let recentRequests: any[] = [];
    if (isAdminOrDeptHead) {
      const { data } = await supabase
        .from('requests')
        .select(`
          *,
          requester:profiles!requester_id(*),
          category:categories(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      recentRequests = data || [];
    } else {
      const { data: myRequests } = await supabase
        .from('requests')
        .select(`
          *,
          requester:profiles!requester_id(*),
          category:categories(name)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });
      const inProgressStatuses = ['Draft', 'Pending'];
      const current = (myRequests || []).find(r => inProgressStatuses.includes(r.status))
        ?? (myRequests || [])[0];
      recentRequests = current ? [current] : [];
    }

    // Get total requests count
    let totalQuery = supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });

    if (!isAdminOrDeptHead) {
      totalQuery = totalQuery.eq('requester_id', user.id);
    }

    const { count: totalRequests } = await totalQuery;

    return {
      budget,
      pendingApprovals: pendingApprovals || 0,
      totalRequests: totalRequests || 0,
      monthlySpending,
      requestsByStatus,
      recentRequests: recentRequests || []
    };
  }
};

// =====================================================
// TRANSPARENCY SEAL ENTRIES (new table)
// =====================================================
function rowToEntry(r: TransparencySealEntryRow): TransparencySealEntry {
  return {
    mission: r.mission ?? undefined,
    featuredItem: {
      projectTitle: r.project_title,
      referenceNo: r.reference_no,
      abc: r.abc,
      closingDate: r.closing_date ?? '',
      openingDate: r.opening_date ?? undefined,
      location: r.location ?? undefined,
      description: r.description ?? undefined,
      requirements: r.requirements ?? [],
      contactPerson: r.contact_person ?? undefined,
      contactEmail: r.contact_email ?? undefined,
      contactPhone: r.contact_phone ?? undefined,
      status: r.status
    }
  };
}

function entryToRow(entry: TransparencySealEntry, displayOrder = 0): Omit<TransparencySealEntryRow, 'id' | 'created_at'> {
  const f = entry.featuredItem ?? {};
  return {
    mission: entry.mission ?? null,
    project_title: f.projectTitle ?? '',
    reference_no: f.referenceNo ?? '',
    abc: typeof f.abc === 'number' && !Number.isNaN(f.abc) ? f.abc : Math.floor(Number(f.abc)) || 0,
    closing_date: f.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(String(f.closingDate)) ? String(f.closingDate) : null,
    opening_date: f.openingDate && /^\d{4}-\d{2}-\d{2}$/.test(String(f.openingDate)) ? String(f.openingDate) : null,
    location: f.location ?? null,
    description: f.description ?? null,
    requirements: Array.isArray(f.requirements) ? f.requirements : [],
    contact_person: f.contactPerson ?? null,
    contact_email: f.contactEmail ?? null,
    contact_phone: f.contactPhone ?? null,
    status: f.status ?? 'Active',
    display_order: displayOrder
  };
}

export const transparencySealAPI = {
  getAll: async (): Promise<TransparencySealEntry[]> => {
    const { data, error } = await supabase
      .from('transparency_seal_entries')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => rowToEntry(r as TransparencySealEntryRow));
  },

  getAllRows: async (): Promise<(TransparencySealEntryRow & { _entry?: TransparencySealEntry })[]> => {
    const { data, error } = await supabase
      .from('transparency_seal_entries')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => {
      const row = r as TransparencySealEntryRow;
      return { ...row, _entry: rowToEntry(row) };
    });
  },

  create: async (entry: TransparencySealEntry): Promise<TransparencySealEntry> => {
    const rows = await supabase.from('transparency_seal_entries').select('display_order').order('display_order', { ascending: false }).limit(1);
    const nextOrder = (rows.data?.[0] as { display_order?: number } | undefined)?.display_order ?? 0;
    const payload = entryToRow(entry, nextOrder + 1);
    const { data, error } = await supabase.from('transparency_seal_entries').insert(payload).select().single();
    if (error) throw error;
    return rowToEntry(data as TransparencySealEntryRow);
  },

  update: async (id: string, entry: TransparencySealEntry): Promise<void> => {
    const payload = entryToRow(entry, 0);
    const { display_order: _, ...updatePayload } = payload;
    const { error } = await supabase.from('transparency_seal_entries').update(updatePayload).eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('transparency_seal_entries').delete().eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// BID BULLETINS API
// =====================================================
const BID_BULLETIN_BUCKET = 'bid-bulletin-attachments';

function rowToBidBulletin(r: BidBulletinRow): BidBulletin & { id: string } {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    title: r.title,
    referenceNo: r.reference_no,
    date: r.date ?? '',
    relatedTo: r.related_to ?? undefined,
    description: r.description ?? undefined,
    changes: r.changes ?? [],
    attachments: Array.isArray(r.attachments) ? r.attachments : []
  };
}

export const bidBulletinsAPI = {
  getAll: async (): Promise<(BidBulletin & { id: string })[]> => {
    const { data, error } = await supabase
      .from('bid_bulletins')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => rowToBidBulletin(r as BidBulletinRow));
  },

  create: async (bulletin: BidBulletin): Promise<BidBulletin & { id: string }> => {
    const { data: maxOrder } = await supabase
      .from('bid_bulletins')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const order = (maxOrder as { display_order?: number } | null)?.display_order ?? 0;
    const payload = {
      type: bulletin.type,
      status: bulletin.status,
      title: bulletin.title,
      reference_no: bulletin.referenceNo,
      date: bulletin.date || null,
      related_to: bulletin.relatedTo || null,
      description: bulletin.description || null,
      changes: bulletin.changes ?? [],
      attachments: bulletin.attachments ?? [],
      display_order: order + 1
    };
    const { data, error } = await supabase.from('bid_bulletins').insert(payload).select().single();
    if (error) throw error;
    return rowToBidBulletin(data as BidBulletinRow);
  },

  update: async (id: string, bulletin: BidBulletin): Promise<void> => {
    const { error } = await supabase
      .from('bid_bulletins')
      .update({
        type: bulletin.type,
        status: bulletin.status,
        title: bulletin.title,
        reference_no: bulletin.referenceNo,
        date: bulletin.date || null,
        related_to: bulletin.relatedTo || null,
        description: bulletin.description || null,
        changes: bulletin.changes ?? [],
        attachments: bulletin.attachments ?? []
      })
      .eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('bid_bulletins').delete().eq('id', id);
    if (error) throw error;
  },

  uploadAttachment: async (bulletinId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${bulletinId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from(BID_BULLETIN_BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BID_BULLETIN_BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  }
};

// =====================================================
// LANDING PAGE API (public read; admin write)
// =====================================================
export const landingAPI = {
  getAll: async (): Promise<LandingContent> => {
    const [pageRes, entriesRes] = await Promise.all([
      supabase.from('landing_page').select('section, data').order('section'),
      supabase.from('transparency_seal_entries').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true })
    ]);
    if (pageRes.error) throw pageRes.error;
    const out: LandingContent = {};
    (pageRes.data || []).forEach((row: { section: string; data: unknown }) => {
      out[row.section as keyof LandingContent] = row.data as never;
    });
    if (entriesRes.data && entriesRes.data.length > 0) {
      const items = (entriesRes.data as TransparencySealEntryRow[]).map((row) => ({ ...rowToEntry(row), id: row.id }));
      const last = items[items.length - 1];
      out.transparency = {
        ...(out.transparency as object),
        items,
        mission: items[0]?.mission ?? (out.transparency as { mission?: string })?.mission,
        featuredItem: last?.featuredItem ?? (out.transparency as { featuredItem?: TransparencyFeaturedItem })?.featuredItem
      } as never;
    }
    return out;
  },

  updateSection: async (section: string, data: unknown): Promise<void> => {
    const { error } = await supabase
      .from('landing_page')
      .upsert({ section, data, updated_at: new Date().toISOString() }, { onConflict: 'section' });
    if (error) throw error;
  }
};

