-- Create waitlist table
create table if not exists waitlist (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  email text not null unique,
  submitted_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table waitlist enable row level security;

-- Create policy to allow inserts from all users (authenticated and unauthenticated)
create policy "Allow insert for all users"
on waitlist for insert
with check (true);

-- Create policy to allow admin users to read all waitlist entries
-- This policy will only work if you have a user with admin role
-- You can modify this based on your auth setup
create policy "Allow read for admin users"
on waitlist for select
using (
  exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
    and auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Create an index on email for faster lookups
create index if not exists idx_waitlist_email on waitlist(email);

-- Create an index on submitted_at for ordering
create index if not exists idx_waitlist_submitted_at on waitlist(submitted_at); 