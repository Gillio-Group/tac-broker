-- Enable the pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Create a function to get the encryption key from environment variables
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Try to get the key from environment variables
    RETURN current_setting('app.settings.encryption_key', true);
EXCEPTION
    WHEN OTHERS THEN
        -- If not found, return a development key (only for local development)
        RETURN 'dev_encryption_key_replace_in_production';
END;
$$;

-- Set the encryption key parameter
DO $$
BEGIN
    PERFORM set_config('app.settings.encryption_key', current_setting('app.settings.encryption_key', true), false);
EXCEPTION
    WHEN OTHERS THEN
        -- If setting doesn't exist, create it with the development key
        PERFORM set_config('app.settings.encryption_key', 'dev_encryption_key_replace_in_production', false);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_encryption_key() TO postgres;
GRANT EXECUTE ON FUNCTION get_encryption_key() TO anon;
GRANT EXECUTE ON FUNCTION get_encryption_key() TO authenticated;
GRANT EXECUTE ON FUNCTION get_encryption_key() TO service_role; 