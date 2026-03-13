// ─────────────────────────────────────────────────────────────────────────────
// supabase.js — YOUR SUPABASE CONFIGURATION
//
// HOW TO FILL THIS IN:
//  1. Go to https://supabase.com → sign in → open your project
//  2. Left sidebar → Settings → API
//  3. Copy "Project URL"  → paste below as SUPABASE_URL
//  4. Copy "anon public" key → paste below as SUPABASE_ANON_KEY
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://affamsfbncdqdctaxpvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmFtc2ZibmNkcWRjdGF4cHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDc3NzEsImV4cCI6MjA4ODg4Mzc3MX0.G6Oaff__D4jRnRkNdzO7iUh4J7KFQ5SSYSsaslM51vE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
