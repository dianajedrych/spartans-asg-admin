import { createClient } from '@supabase/supabase-js';

// Publiczny URL + publishable key — bezpieczne do trzymania w kodzie
// (ten sam projekt co sklep, chronione przez Row Level Security w bazie).
// Nigdy nie dodawaj tu service_role key.
const SUPABASE_URL = 'https://kgwshquqpzrsvidwogrm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ifViF8MAc7ZuBCLblQRUUw_C5iPG1Ey';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
