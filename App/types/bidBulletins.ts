export type BidBulletinAttachment = { name: string; url: string };

export type BidBulletin = {
  id: string;
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
