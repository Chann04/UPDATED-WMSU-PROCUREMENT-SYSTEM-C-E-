import { supabase, isPersistedSessionAuthFailure, clearPersistedAuthSession } from './supabase';
import type { RequestWithRelations } from '@/types/requests';

export type CollegeBudgetSummary = {
  collegeName: string;
  totalBudget: number;
  allocatedTotal: number;
  unallocatedTotal: number;
  committedTotal: number;
  remaining: number;
  budgetTypesCount: number;
  budgetTypes: Array<{
    id: string;
    fundCode: string | null;
    name: string;
    amount: number;
    usedAmount: number;
    remainingAmount: number;
    isActive: boolean;
  }>;
};

async function resolveHandledCollegeName(userId: string): Promise<string | null> {
  const { data: collegeRow } = await supabase
    .from('colleges')
    .select('name')
    .eq('handler_id', userId)
    .maybeSingle();
  if (collegeRow?.name) return String(collegeRow.name);

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('department')
    .eq('id', userId)
    .maybeSingle();
  return profileRow?.department ? String(profileRow.department) : null;
}

async function getRequesterIdsByCollegeName(collegeName: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('department', collegeName);
  if (error) throw new Error(error.message || 'Failed to load profiles for this college.');
  return (data ?? []).map((r) => String(r.id));
}

export const collegeAdminAPI = {
  getBudgetSummary: async (): Promise<CollegeBudgetSummary | null> => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      if (isPersistedSessionAuthFailure(authError)) await clearPersistedAuthSession();
      throw authError;
    }
    if (!user) throw new Error('Not authenticated');

    const collegeName = await resolveHandledCollegeName(user.id);
    if (!collegeName) return null;

    const { data: college } = await supabase
      .from('colleges')
      .select('id')
      .eq('name', collegeName)
      .maybeSingle();
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved_budget')
      .eq('id', user.id)
      .maybeSingle();
    const totalBudget = Number(profile?.approved_budget || 0);
    if (!college?.id) {
      return {
        collegeName,
        totalBudget,
        allocatedTotal: 0,
        unallocatedTotal: totalBudget,
        committedTotal: 0,
        remaining: totalBudget,
        budgetTypesCount: 0,
        budgetTypes: [],
      };
    }

    const { data: budgetTypes, error: budgetTypesError } = await supabase
      .from('college_budget_types')
      .select('id,fund_code,name,amount,is_active')
      .eq('college_id', college.id);
    if (budgetTypesError) throw budgetTypesError;
    const allocatedTotal = (budgetTypes ?? [])
      .filter((b) => b.is_active !== false)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const unallocatedTotal = Math.max(0, totalBudget - allocatedTotal);

    const requesterIds = await getRequesterIdsByCollegeName(collegeName);
    let committedTotal = 0;
    const spentByBudgetTypeId = new Map<string, number>();
    if (requesterIds.length > 0) {
      const { data: requests, error: reqErr } = await supabase
        .from('requests')
        .select('total_price,status,college_budget_type_id')
        .in('requester_id', requesterIds)
        .in('status', ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed']);
      if (reqErr) throw reqErr;
      for (const r of requests ?? []) {
        const price = Number(r.total_price || 0);
        committedTotal += price;
        const budgetTypeId = r.college_budget_type_id ? String(r.college_budget_type_id) : null;
        if (!budgetTypeId) continue;
        spentByBudgetTypeId.set(budgetTypeId, (spentByBudgetTypeId.get(budgetTypeId) || 0) + price);
      }
    }

    return {
      collegeName,
      totalBudget,
      allocatedTotal,
      unallocatedTotal,
      committedTotal,
      remaining: Math.max(0, allocatedTotal - committedTotal),
      budgetTypesCount: (budgetTypes ?? []).filter((b) => b.is_active !== false).length,
      budgetTypes: (budgetTypes ?? []).map((b) => ({
        id: String(b.id),
        fundCode: b.fund_code ? String(b.fund_code) : null,
        name: String(b.name || ''),
        amount: Number(b.amount || 0),
        usedAmount: spentByBudgetTypeId.get(String(b.id)) || 0,
        remainingAmount: Math.max(0, Number(b.amount || 0) - (spentByBudgetTypeId.get(String(b.id)) || 0)),
        isActive: b.is_active !== false,
      })),
    };
  },

  getRequestHistory: async (): Promise<RequestWithRelations[]> => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      if (isPersistedSessionAuthFailure(authError)) await clearPersistedAuthSession();
      throw authError;
    }
    if (!user) throw new Error('Not authenticated');

    const collegeName = await resolveHandledCollegeName(user.id);
    if (!collegeName) return [];

    // Preferred path: security-definer RPC avoids RLS issues when DeptHead needs
    // to read requests submitted by department users under the handled college.
    const rpcResult = await supabase.rpc('mobile_get_college_requests');
    if (!rpcResult.error) {
      const rows = (rpcResult.data ?? []) as RequestWithRelations[];
      if (rows.length === 0) return [];

      const categoryIds = Array.from(
        new Set(rows.map((r) => r.category_id).filter((id): id is string => !!id))
      );
      if (categoryIds.length === 0) return rows;

      const categoryRows = await supabase
        .from('categories')
        .select('id,name')
        .in('id', categoryIds);
      if (categoryRows.error) return rows;

      const categoryMap = new Map(
        (categoryRows.data ?? []).map((c) => [String(c.id), { name: String(c.name ?? '') }])
      );

      return rows.map((row) => ({
        ...row,
        category: row.category_id ? categoryMap.get(String(row.category_id)) : row.category,
      }));
    }

    const requesterIds = await getRequesterIdsByCollegeName(collegeName);
    if (requesterIds.length === 0) return [];

    // Avoid ambiguous embeds: `requests` has two FKs to `suppliers` (supplier_id, bid_winner_supplier_id)
    // and multiple FKs to `profiles`, which makes PostgREST return PGRST201 ("multiple relationships").
    const withCategory = await supabase
      .from('requests')
      .select(
        `
        *,
        category:categories(name)
      `
      )
      .in('requester_id', requesterIds)
      .order('created_at', { ascending: false });

    if (!withCategory.error) {
      return (withCategory.data ?? []) as RequestWithRelations[];
    }

    const plain = await supabase
      .from('requests')
      .select('*')
      .in('requester_id', requesterIds)
      .order('created_at', { ascending: false });

    if (plain.error) throw new Error(plain.error.message || 'Failed to load request history.');
    return (plain.data ?? []) as RequestWithRelations[];
  },
};

