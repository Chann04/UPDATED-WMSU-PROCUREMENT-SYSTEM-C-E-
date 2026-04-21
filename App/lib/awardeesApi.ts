import { supabase } from './supabase';

export type AwardedRequest = {
  id: string;
  item_name: string;
  total_price: number;
  approved_at: string | null;
  status: string;
  supplier: { name: string } | null;
};

export const awardeesAPI = {
  getAwardees: async (): Promise<AwardedRequest[]> => {
    const { data, error } = await supabase
      .from('requests')
      .select('id, item_name, total_price, approved_at, status, supplier:suppliers!supplier_id(name)')
      .not('supplier_id', 'is', null)
      .order('approved_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AwardedRequest[];
  },
};
