# Waitlist Mode Setup Guide

This guide explains how to set up and use the waitlist mode for your StudyWithAI landing page.

## ✅ What's Been Implemented

The waitlist mode allows you to temporarily switch your landing page to focus on collecting email signups while preserving all existing authentication functionality in the codebase.

### Features Added:
- **Waitlist signup form** with email + optional name fields
- **Environment-based toggle** to switch between auth mode and waitlist mode
- **Conditional UI components** that hide/show based on mode
- **API endpoint** for processing waitlist signups
- **Supabase table** for storing waitlist entries
- **Success confirmation** after signup

## 🚀 Setup Instructions

### 1. Environment Configuration

Create or update your `.env.local` file in the project root:

```bash
# Waitlist Mode Toggle
NEXT_PUBLIC_WAITLIST_MODE=true

# Your existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Setup

Run the migration to create the waitlist table in your Supabase database:

```sql
-- You can run this in your Supabase SQL editor or via migration
-- File: supabase/migrations/create_waitlist_table.sql

create table if not exists waitlist (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  email text not null unique,
  submitted_at timestamp with time zone default timezone('utc'::text, now())
);

alter table waitlist enable row level security;

create policy "Allow insert for all users"
on waitlist for insert
with check (true);

create policy "Allow read for admin users"
on waitlist for select
using (
  exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
    and auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

create index if not exists idx_waitlist_email on waitlist(email);
create index if not exists idx_waitlist_submitted_at on waitlist(submitted_at);
```

### 3. Deploy and Test

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the waitlist form:**
   - Visit your landing page
   - You should see the new waitlist-focused hero section
   - Sign in/Sign up buttons should be hidden
   - Try submitting the waitlist form with a test email

3. **Verify in Supabase:**
   - Check your Supabase dashboard
   - Look for the `waitlist` table
   - Confirm entries are being stored correctly

## 🔄 Switching Between Modes

### Enable Waitlist Mode:
```bash
NEXT_PUBLIC_WAITLIST_MODE=true
```

### Disable Waitlist Mode (return to normal):
```bash
NEXT_PUBLIC_WAITLIST_MODE=false
# or remove the line entirely
```

After changing the environment variable, restart your development server.

## 📋 What Changes When in Waitlist Mode

### Hidden Elements:
- Sign In / Sign Up buttons in navbar
- Pricing section on landing page
- Bottom CTA section with auth buttons
- Pricing link in navigation

### New Elements:
- Waitlist-focused hero section
- Waitlist signup form
- Updated messaging and copy
- Success confirmation after signup

### Preserved Elements:
- All authentication routes (`/signin`, `/signup`) still work
- All Supabase auth logic remains intact
- User profiles and dashboard access for existing users
- All existing functionality is preserved

## 🎨 Customization

### Update Waitlist Copy:
Edit `src/lib/config.ts` to customize messages:

```typescript
waitlist: {
  title: 'Your AI Study Companion is Almost Ready',
  subtitle: 'Join the waitlist and be first to try...',
  successMessage: 'Thanks! You\'re on the waitlist!',
  features: [
    'AI-generated flashcards',
    'Smart quizzes', 
    'Spaced repetition'
  ]
}
```

### Style the Waitlist Form:
The form component is located at `src/components/waitlist-signup.tsx` and uses Tailwind CSS classes.

## 📊 Managing Waitlist Data

### View Waitlist Entries:
You can query the waitlist table in Supabase:

```sql
SELECT full_name, email, submitted_at 
FROM waitlist 
ORDER BY submitted_at DESC;
```

### Export Waitlist:
Use Supabase's export functionality or query the data via API to export your waitlist for email marketing tools.

## 🔧 Troubleshooting

### Common Issues:

1. **Environment variable not working:**
   - Ensure you restart your dev server after changing `.env.local`
   - Check that the variable name is exactly `NEXT_PUBLIC_WAITLIST_MODE`

2. **Waitlist form not submitting:**
   - Check browser console for errors
   - Verify Supabase connection and table exists
   - Ensure RLS policies are set up correctly

3. **Duplicate email errors:**
   - This is expected behavior - each email can only be added once
   - The API handles this gracefully with a user-friendly message

### Need Help?
- Check the browser console for errors
- Verify your Supabase configuration
- Ensure all environment variables are set correctly

## 🎯 Next Steps

Once you're ready to launch:
1. Set `NEXT_PUBLIC_WAITLIST_MODE=false`
2. Your normal auth flow will be restored
3. All waitlist data will be preserved in the database
4. You can continue to access waitlist data for marketing purposes

The implementation preserves all existing functionality, so switching back is seamless! 