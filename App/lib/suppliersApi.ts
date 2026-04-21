import { supabase } from './supabase';
import type { Supplier } from '@/types/suppliers';

export const suppliersAPI = {
  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Supplier[];
  },
};
