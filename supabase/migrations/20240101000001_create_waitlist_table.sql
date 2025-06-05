-- Create waitlist table for email collection
-- This table allows anonymous inserts for waitlist signups

create table if not exists waitlist (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  email text not null unique,
  submitted_at timestamp with time zone default timezone('utc'::text, now())
);

-- Disable Row Level Security for this table to allow anonymous inserts
-- Since this is just collecting email addresses, RLS is not needed
alter table waitlist disable row level security;

-- Grant insert permissions to anonymous and authenticated users
grant insert on waitlist to anon;
grant insert on waitlist to authenticated;

-- Grant select permissions to authenticated users (for admin access)
grant select on waitlist to authenticated;

-- Create indexes for better performance
create index if not exists idx_waitlist_email on waitlist(email);
create index if not exists idx_waitlist_submitted_at on waitlist(submitted_at);

-- Verify the table was created successfully
select 'Waitlist table created successfully!' as status; 