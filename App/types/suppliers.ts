export type Supplier = {
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
