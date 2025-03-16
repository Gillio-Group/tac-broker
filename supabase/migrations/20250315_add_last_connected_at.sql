-- Add last_connected_at column to gunbroker_integrations table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gunbroker_integrations' 
        AND column_name = 'last_connected_at'
    ) THEN
        ALTER TABLE gunbroker_integrations 
        ADD COLUMN last_connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Set comment for the column
COMMENT ON COLUMN gunbroker_integrations.last_connected_at IS 'Records when the integration was last used to connect to Gunbroker'; 