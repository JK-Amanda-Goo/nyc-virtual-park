import { createClient } from '@supabase/supabase-js';

// Public (publishable) key only; row-level security in the database does the protecting.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
);
