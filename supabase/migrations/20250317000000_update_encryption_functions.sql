-- Update the encryption functions to use the app.encryption_key parameter
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

-- Re-encrypt existing passwords with the new key
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, encrypted_password FROM gunbroker_integrations WHERE encrypted_password IS NOT NULL
    LOOP
        BEGIN
            -- Decrypt with old key
            DECLARE
                decrypted_pass text;
                new_encrypted_pass text;
            BEGIN
                decrypted_pass := pgp_sym_decrypt(
                    decode(r.encrypted_password, 'base64')::bytea,
                    'AES256'
                )::text;
                
                IF decrypted_pass IS NOT NULL THEN
                    -- Re-encrypt with new key
                    new_encrypted_pass := encode(
                        pgp_sym_encrypt(
                            decrypted_pass,
                            current_setting('app.encryption_key', true)
                        )::bytea,
                        'base64'
                    );
                    
                    -- Update the record
                    UPDATE gunbroker_integrations 
                    SET encrypted_password = new_encrypted_pass
                    WHERE id = r.id;
                END IF;
            END;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error processing record %: %', r.id, SQLERRM;
        END;
    END LOOP;
END;
$$; 