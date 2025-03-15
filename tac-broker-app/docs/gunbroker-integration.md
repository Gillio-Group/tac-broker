# Gunbroker API Integration

This document provides details on how the TAC Broker application integrates with the Gunbroker API.

## Environment Setup

The following environment variables need to be set up:

```
GUNBROKER_DEV_KEY=your_dev_key_here
```

You can obtain a Dev Key by registering as a developer on the Gunbroker Developer Portal: https://api.gunbroker.com/v1/User/Help

## Database Configuration

The integration uses the Supabase database to store Gunbroker authentication details securely. Make sure to run the migration scripts to set up the required tables and functions:

```bash
npx supabase migration up
```

### Critical Database Functions

The integration relies on two key PostgreSQL functions for securely storing Gunbroker passwords:

1. `encrypt_password(password text)`: Encrypts the user's Gunbroker password before storing it
2. `decrypt_password(encrypted_password text)`: Decrypts the stored password for token refresh

### Security Configuration

For these functions to work properly, you need to set a secure encryption key in your Supabase database:

```sql
ALTER DATABASE postgres SET app.encryption_key TO 'your_very_secure_random_key_here';
```

This can be done via the SQL Editor in the Supabase Dashboard.

## Authentication Flow

1. User provides their Gunbroker username and password in the Connect page
2. The application encrypts the password and stores it securely in Supabase
3. The application exchanges the credentials for an access token via the Gunbroker API
4. The access token is stored in the database and used for subsequent API calls
5. When the token expires, the system automatically refreshes it using the stored encrypted credentials

## Database Tables

The main table used for Gunbroker integration is `gunbroker_integrations`:

| Column Name | Type | Description |
|-------------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| username | text | Gunbroker username |
| encrypted_password | text | Encrypted Gunbroker password |
| access_token | text | Current Gunbroker access token |
| token_expires_at | timestamp | When the token expires |
| is_sandbox | boolean | Whether using sandbox or production |
| is_active | boolean | Whether the integration is active |
| created_at | timestamp | When the integration was created |
| updated_at | timestamp | When the integration was last updated |
| last_connected_at | timestamp | When the user last connected |

## API Routes

The following API routes are used for Gunbroker integration:

- `POST /api/gunbroker/connect`: Connect a Gunbroker account
- `GET /api/gunbroker/test`: Test the connection with a Gunbroker account
- `GET /api/gunbroker/listings`: Get listings from Gunbroker
- `GET /api/gunbroker/orders`: Get orders from Gunbroker

## UI Components

The main UI components for Gunbroker integration are:

- `/dashboard/connect`: Page for connecting a Gunbroker account
- `/dashboard/settings`: Page with a Gunbroker tab for managing connections

## Troubleshooting

If you're having issues with the Gunbroker integration, check the following:

1. Verify the `GUNBROKER_DEV_KEY` environment variable is set correctly
2. Ensure the database encryption functions are working properly
3. Check that the `app.encryption_key` is set in the Supabase database
4. Verify that the user has active Gunbroker integrations in the database

## API Documentation

For more details on the Gunbroker API, refer to the official documentation:
https://api.gunbroker.com/v1 