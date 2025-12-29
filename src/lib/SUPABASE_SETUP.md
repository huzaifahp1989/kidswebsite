# Supabase Setup

This project is now configured with Supabase. Here's how to use it:

## Configuration

The Supabase client is configured in `src/lib/supabase.js` with the following credentials:

- **Project URL**: `https://bqmfrmfevnjdvpttsvof.supabase.co`
- **Anon Key**: Configured in `.env` file

## Environment Variables

Make sure your `.env` file contains:

```env
VITE_SUPABASE_URL=https://bqmfrmfevnjdvpttsvof.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Usage

### Import the Supabase client

```javascript
import { supabase, supabaseAuth, isSupabaseConfigured } from '@/lib/supabase';
```

### Authentication Examples

```javascript
// Sign up
const { data, error } = await supabaseAuth.signUp('user@example.com', 'password', {
  full_name: 'John Doe'
});

// Sign in
const { data, error } = await supabaseAuth.signIn('user@example.com', 'password');

// Sign out
await supabaseAuth.signOut();

// Get current session
const { data: { session }, error } = await supabaseAuth.getSession();

// Listen to auth state changes
const { data: { subscription } } = supabaseAuth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
});
```

### Database Examples

```javascript
// Select data
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'user@example.com');

// Insert data
const { data, error } = await supabase
  .from('users')
  .insert({ email: 'user@example.com', name: 'John Doe' });

// Update data
const { data, error } = await supabase
  .from('users')
  .update({ name: 'Jane Doe' })
  .eq('id', 'user-id');

// Delete data
const { data, error } = await supabase
  .from('users')
  .delete()
  .eq('id', 'user-id');
```

### Storage Examples

```javascript
// Upload a file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('path/to/file.jpg', file);

// Download a file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('path/to/file.jpg');

// Get public URL
const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('path/to/file.jpg');
```

### Real-time Subscriptions

```javascript
// Subscribe to changes
const subscription = supabase
  .channel('users')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'users' },
    (payload) => {
      console.log('New user:', payload.new);
    }
  )
  .subscribe();
```

## Testing the Connection

You can test the Supabase connection by clicking the "TEST SUPABASE" button in the Games page, or by running:

```javascript
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

if (isSupabaseConfigured()) {
  const { data, error } = await supabase.auth.getSession();
  console.log('Connection test:', error ? error.message : 'Success');
}
```

## Dashboard

Access your Supabase dashboard at:
https://supabase.com/dashboard/project/bqmfrmfevnjdvpttsvof


