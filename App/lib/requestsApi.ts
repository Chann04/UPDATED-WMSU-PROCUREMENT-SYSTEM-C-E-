import { supabase, isPersistedSessionAuthFailure, clearPersistedAuthSession } from './supabase';
import type { RequestWithRelations } from '@/types/requests';

/**
 * Load the signed-in user's requests.
 *
 * Note: `requests` may have **two** foreign keys to `suppliers` (`supplier_id`, `bid_winner_supplier_id`).
 * Embedding `suppliers(...)` without an explicit FK hint makes PostgREST return PGRST201 ("multiple relationships").
 * We only embed `categories` here; category + item data is enough for list cards.
 */
export const requestsAPI = {
  getMyRequests: async (): Promise<RequestWithRelations[]> => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      if (isPersistedSessionAuthFailure(authError)) await clearPersistedAuthSession();
      throw authError;
    }
    if (!user) throw new Error('Not authenticated');

    const withCategory = await supabase
      .from('requests')
      .select(
        `
        *,
        category:categories(name)
      `
      )
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (!withCategory.error) {
      return (withCategory.data ?? []) as RequestWithRelations[];
    }

    // Fallback: no embeds (works if category embed fails on older schemas).
    const plain = await supabase
      .from('requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (plain.error) throw plain.error;
    return (plain.data ?? []) as RequestWithRelations[];
  },
};
