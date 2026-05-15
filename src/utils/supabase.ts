import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mhdrbjpqmzswswoazwjg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_wFx9tlxImVfEpRN4NMkS1g_QOm64aj6'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
