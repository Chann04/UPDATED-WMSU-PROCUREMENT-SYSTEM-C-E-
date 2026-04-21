import { supabase } from './supabase';
import type { BidBulletin, BidBulletinRow } from '@/types/bidBulletins';

function rowToBulletin(r: BidBulletinRow): BidBulletin {
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
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
  };
}

export const bidBulletinsAPI = {
  getAll: async (): Promise<BidBulletin[]> => {
    const { data, error } = await supabase
      .from('bid_bulletins')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => rowToBulletin(r as BidBulletinRow));
  },
};
