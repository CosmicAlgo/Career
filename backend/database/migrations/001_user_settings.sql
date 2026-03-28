-- CareerRadar User Settings Table
-- Stores user preferences for job matching and GitHub profile

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username TEXT,
  target_roles TEXT[] DEFAULT ARRAY['ml_engineer', 'mlops']::TEXT[],
  target_locations TEXT[] DEFAULT ARRAY['UK', 'Remote']::TEXT[],
  target_seniority TEXT[] DEFAULT ARRAY['mid', 'senior']::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at DESC);

-- Insert default settings if table is empty
INSERT INTO user_settings (github_username, target_roles, target_locations, target_seniority)
SELECT 'octocat',
       ARRAY['ml_engineer', 'mlops', 'devops', 'backend']::TEXT[],
       ARRAY['UK', 'Remote', 'London']::TEXT[],
       ARRAY['mid', 'senior']::TEXT[]
WHERE NOT EXISTS (SELECT 1 FROM user_settings LIMIT 1);
