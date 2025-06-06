-- Create contact_messages table for storing contact form submissions
-- Migration: 20250616000001_create_contact_messages_table
-- Description: Adds contact_messages table with RLS policies for handling contact form submissions

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general' CHECK (type IN ('general', 'technical', 'billing', 'feature', 'partnership', 'other')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Email validation constraint
    CONSTRAINT contact_messages_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS contact_messages_type_idx ON public.contact_messages(type);
CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON public.contact_messages(email);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER contact_messages_updated_at
    BEFORE UPDATE ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting contact messages (anyone can submit)
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages
    FOR INSERT
    WITH CHECK (true);

-- Create policy for reading contact messages (only authenticated users with admin role)
-- Note: You'll need to adjust this based on your admin/staff user system
CREATE POLICY "Admin users can read contact messages" ON public.contact_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                -- Add admin emails here or create a proper role system
                'admin@flashly.ai',
                'support@flashly.ai'
            )
        )
    );

-- Create policy for updating contact messages (only admin users)
CREATE POLICY "Admin users can update contact messages" ON public.contact_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'admin@flashly.ai',
                'support@flashly.ai'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'admin@flashly.ai',
                'support@flashly.ai'
            )
        )
    );

-- Grant necessary permissions
GRANT INSERT ON public.contact_messages TO anon;
GRANT INSERT ON public.contact_messages TO authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;

-- Create a view for easier querying (optional)
CREATE OR REPLACE VIEW public.contact_messages_summary AS
SELECT 
    id,
    name,
    email,
    subject,
    LEFT(message, 100) || CASE WHEN LENGTH(message) > 100 THEN '...' ELSE '' END as message_preview,
    type,
    status,
    created_at,
    updated_at
FROM public.contact_messages
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.contact_messages_summary TO authenticated;

-- Add comment to the table
COMMENT ON TABLE public.contact_messages IS 'Stores contact form submissions from the website';
COMMENT ON COLUMN public.contact_messages.type IS 'Type of inquiry: general, technical, billing, feature, partnership, other';
COMMENT ON COLUMN public.contact_messages.status IS 'Processing status: new, in_progress, resolved, closed'; 