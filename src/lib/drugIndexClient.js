import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

const drugIndexUrl = env.PUBLIC_DRUGINDEX_URL || '';
const drugIndexKey = env.PUBLIC_DRUGINDEX_ANON_KEY || '';

export const drugIndexApi = (drugIndexUrl && drugIndexKey) 
  ? createClient(drugIndexUrl, drugIndexKey) 
  : null;

if (!drugIndexApi) {
  console.warn("⚠️ DrugIndex credentials missing! Check .env");
}