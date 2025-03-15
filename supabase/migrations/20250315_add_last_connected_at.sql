-- Add last_connected_at column to gunbroker_integrations table
ALTER TABLE gunbroker_integrations 
ADD COLUMN last_connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set comment for the column
COMMENT ON COLUMN gunbroker_integrations.last_connected_at IS 'Records when the integration was last used to connect to Gunbroker'; 