-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Create or replace the decrypt_password function
CREATE OR REPLACE FUNCTION "public"."decrypt_password"("encrypted_password" "text")
RETURNS "text"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_password, 'base64')::bytea,
        current_setting('app.encryption_key', true)
    )::text;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error decrypting password: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Create or replace the encrypt_password function
CREATE OR REPLACE FUNCTION "public"."encrypt_password"("password" "text")
RETURNS "text"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(
            password,
            current_setting('app.encryption_key', true)
        )::bytea,
        'base64'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error encrypting password: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Grant permissions on the functions
GRANT ALL ON FUNCTION "public"."decrypt_password"("encrypted_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_password"("encrypted_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_password"("encrypted_password" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."encrypt_password"("password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_password"("password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_password"("password" "text") TO "service_role";

-- Make sure the app.encryption_key parameter is set (this should be replaced with a secure value)
-- In production, this should be set via Supabase dashboard or CLI, not in migrations
DO $$
BEGIN
    BEGIN
        PERFORM set_config('app.encryption_key', 'your_secure_encryption_key_here', false);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Failed to set app.encryption_key parameter: %', SQLERRM;
    END;
END
$$; 