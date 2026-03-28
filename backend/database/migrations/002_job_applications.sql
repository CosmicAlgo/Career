-- Job Applications Tracker Table
-- Stores job applications and tracks them through the hiring pipeline

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- For future multi-user support
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    source_url TEXT,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'linkedin', 'indeed', 'glassdoor', 'company_careers', 'referral', 'other')),
    status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'applied', 'phone_screen', 'technical', 'final', 'offer', 'rejected')),
    date_applied DATE,
    notes TEXT,
    salary_range TEXT,
    location TEXT,
    follow_up_date DATE,  -- Auto-set to 7 days after applied, cleared on offer/rejected
    response_date DATE,  -- When company responded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX idx_job_applications_follow_up_date ON job_applications(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_job_applications_company ON job_applications(company);

-- RLS (Row Level Security) - Users can only see their own applications
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own applications
CREATE POLICY "Users can view own applications" ON job_applications
    FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

-- Policy: Users can insert their own applications
CREATE POLICY "Users can insert own applications" ON job_applications
    FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Policy: Users can update their own applications
CREATE POLICY "Users can update own applications" ON job_applications
    FOR UPDATE USING (user_id IS NULL OR user_id = auth.uid());

-- Policy: Users can delete their own applications
CREATE POLICY "Users can delete own applications" ON job_applications
    FOR DELETE USING (user_id IS NULL OR user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to set follow_up_date when status changes to 'applied'
CREATE OR REPLACE FUNCTION set_follow_up_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Set follow-up date to 7 days from now when applied
    IF NEW.status = 'applied' AND OLD.status != 'applied' THEN
        NEW.follow_up_date = CURRENT_DATE + INTERVAL '7 days';
    END IF;

    -- Clear follow-up date when offer or rejected
    IF NEW.status IN ('offer', 'rejected') THEN
        NEW.follow_up_date = NULL;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically manage follow-up dates
CREATE TRIGGER manage_follow_up_date
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION set_follow_up_date();

-- Grant permissions
GRANT ALL ON job_applications TO authenticated;
GRANT SELECT ON job_applications TO anon;
