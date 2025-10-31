# Testing OAuth Flow

This document describes how to test the NextAuth Google sign-in implementation and verify token persistence.

## Prerequisites

1. Docker services running (Postgres and Redis)
2. Environment variables configured in `.env`
3. Google OAuth redirect URI configured in Google Cloud Console

## Google Cloud Console Setup

Before testing, ensure your Google OAuth client is properly configured:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Find your OAuth 2.0 Client ID
4. Add the following to **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. If testing on a deployed environment, add:
   ```
   https://your-domain.com/api/auth/callback/google
   ```

## Testing Steps

### 1. Start the Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

### 2. Test Authentication Flow

1. **Navigate to Homepage**
   - Open http://localhost:3000
   - You should be redirected to `/auth/signin` (due to middleware)

2. **Sign In**
   - Click "Sign in with Google"
   - Select your Google account
   - Grant permissions when prompted:
     - View your email address
     - View your basic profile info
     - Read, compose, send, and permanently delete Gmail messages

3. **Verify Successful Sign-In**
   - You should be redirected back to the homepage
   - You should see:
     - Your name in the welcome message
     - Your email in the navigation bar
     - Connected Gmail account information
     - Sign out button

### 3. Verify Token Persistence

#### Check Database

Connect to the database and verify tokens are stored encrypted:

```bash
npm run db:studio
```

Navigate to the `Account` table and verify:
- `accessToken` contains encrypted data (base64 string, not plain text)
- `refreshToken` contains encrypted data
- `tokenExpiry` has a valid timestamp
- `gmailProfileId` contains your Gmail email address

#### Check Logs

The NextAuth sign-in callback logs success messages:

```
Sign-in successful for user your-email@gmail.com, Gmail: your-email@gmail.com
```

### 4. Test Token Decryption (Gmail API)

This will be tested when implementing Gmail polling/fetching features. The `getGmailClient()` function in `src/lib/gmail.ts` should:
- Decrypt tokens from the database
- Create authenticated Gmail client
- Successfully make API calls

### 5. Test Session Persistence

1. Refresh the page - you should remain signed in
2. Open a new tab to http://localhost:3000 - you should be signed in
3. Close and reopen your browser - session should persist (if not in incognito)

### 6. Test Sign Out

1. Click "Sign Out" button
2. You should be redirected to `/auth/signin`
3. Attempting to navigate to `/` should redirect back to sign-in

### 7. Test Middleware Protection

Try accessing protected routes without authentication:
- Clear browser cookies
- Navigate to http://localhost:3000
- Should immediately redirect to `/auth/signin`

## Security Verification

### Token Encryption

Verify tokens are encrypted at rest:

```bash
# Connect to database
npm run db:studio

# Check Account table
# accessToken and refreshToken should be long base64 strings
# They should NOT be readable OAuth tokens starting with "ya29."
```

### Token Refresh

When tokens expire (typically after 1 hour), the `getGmailClient()` function should:
1. Automatically refresh the access token using the refresh token
2. Encrypt and save the new access token to the database
3. Continue working without requiring re-authentication

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Visit `/` without auth | Redirect to `/auth/signin` |
| Click "Sign in with Google" | OAuth consent screen appears |
| Grant permissions | Redirect to `/` with user info displayed |
| Check database `Account` table | Encrypted tokens stored |
| Refresh page | Remain signed in |
| Sign out | Redirect to `/auth/signin`, session cleared |
| Visit `/` after sign out | Redirect to `/auth/signin` |

## Troubleshooting

### "Redirect URI mismatch" error
- Ensure `http://localhost:3000/api/auth/callback/google` is added to Google Cloud Console
- Check `NEXTAUTH_URL` in `.env` matches your app URL

### "No access token received" error
- Check Google OAuth scopes are configured correctly
- Ensure `access_type: 'offline'` is set in auth config

### Encryption errors
- Verify `ENCRYPTION_KEY` is set in `.env`
- Key must be 32 bytes (generated with `openssl rand -base64 32`)

### Database connection errors
- Ensure Docker services are running: `docker-compose ps`
- Check `DATABASE_URL` in `.env`

### Session not persisting
- Clear browser cookies and try again
- Check Prisma migrations are up to date: `npm run db:migrate`

## Next Steps

After successful OAuth testing:
1. Implement Gmail message polling
2. Test Gmail API calls with decrypted tokens
3. Verify token refresh mechanism works
4. Add email categorization features
