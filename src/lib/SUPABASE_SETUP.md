# Supabase Setup

Project URL: **https://jlqrbbqsuksncrxjcmbc.supabase.co**

## Environment variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://jlqrbbqsuksncrxjcmbc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard
VITE_ADMIN_EMAIL=your-admin@email.com
```

Get the anon key from **Supabase → Project Settings → API**.

## Database tables

Run `supabase/schema.sql` in the Supabase SQL editor to create:

- `users`
- `sponsors`
- `announcements`
- `quiz_answers`
- `game_scores`
- `child_progress_logs`

## Auth

1. Enable **Email / Password** in Supabase Authentication
2. Add your site URL to **Redirect URLs** (e.g. `https://imediackids.com`)
3. Create an admin user with the same email as `VITE_ADMIN_EMAIL`

## Usage in code

```javascript
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { watchAuth, signIn, getUserProfile } from '@/api/firebase';
```

The `firebase.js` API module name is kept for compatibility, but all data now uses Supabase.
