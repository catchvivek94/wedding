/* ShaadiDesk · backend configuration
 *
 * Leave these empty and the site runs exactly as it does today: everything
 * saves to this browser only. Fill them in and it syncs across devices.
 *
 * Both values are safe to commit to a public repo — the anon key is designed
 * to be public, and the database is protected by row-level security that
 * requires a signed-in user (see supabase-schema.sql).
 *
 * Get them from: Supabase dashboard → Project Settings → API
 */
const SUPABASE_URL  = "https://rsysbvsamqbemxlhhwpx.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeXNidnNhbXFiZW14bGhod3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODQ2MTYsImV4cCI6MjEwMTM2MDYxNn0.zI161fI-2WphNHwP71uRpbKt7BTuNLfc-JWTilg2Mno";   // the "anon / public" key, NOT the service_role key

const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON);

// Set only after deploying apps-script/Code.gs. No secret belongs in this URL.
const KURTA_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzs_DRapb8x6jG0VOF4PJ7EstMD9OzrS5l-eNLJu3YqV4h4fdlGkObPfn7cLkVEwaR2Kg/exec';
