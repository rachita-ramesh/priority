import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://vgudsmczrmdlwreevdrs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndWRzbWN6cm1kbHdyZWV2ZHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MDQ0MDksImV4cCI6MjA1NjM4MDQwOX0.Z8EwYqbr5SP9FanwwiAZZccABtQa3lU0bTgZo6fneJY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
}); 