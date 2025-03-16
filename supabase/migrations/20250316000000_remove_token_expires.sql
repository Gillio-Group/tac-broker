-- Migration to remove token_expires_at column and update token refresh strategy
-- We are moving to a refresh-on-every-call strategy instead of expiration-based

-- Remove the token_expires_at column if it exists
ALTER TABLE IF EXISTS "public"."gunbroker_integrations" 
DROP COLUMN IF EXISTS "token_expires_at";

-- Update comment on last_connected_at to reflect new token strategy
COMMENT ON COLUMN "public"."gunbroker_integrations"."last_connected_at" IS 
'Tracks when the integration was last used. Used for monitoring token refresh activity.'; 