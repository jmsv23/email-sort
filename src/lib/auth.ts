import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { encrypt } from './encryption';
import { google } from 'googleapis';

const nextAuthConfig = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'consent',
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.modify',
          ].join(' '),
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  events: {
    async linkAccount({ user, account }) {
      try {
        // Fetch Gmail profile ID FIRST with plain token
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ access_token: account.access_token });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });

        // THEN encrypt tokens after successful API call
        const encryptedAccessToken = encrypt(account?.access_token ?? '');
        const encryptedRefreshToken = account.refresh_token ? encrypt(account.refresh_token) : null;

        // Update account with encrypted tokens, Gmail profile, and historyId
        if (account.providerAccountId && profile.data.emailAddress) {
          await prisma.account.updateMany({
            where: {
              provider: 'google',
              providerAccountId: account.providerAccountId,
            },
            data: {
              refresh_token: encryptedRefreshToken,
              access_token: encryptedAccessToken,
              profile_id: profile.data.emailAddress,
              history_id: profile.data.historyId ? String(profile.data.historyId) : null,
            },
          });
        }

        console.log(`Link gmail profile and encrypt token successful for user ${user.email}, Gmail: ${profile.data.emailAddress}`);
      } catch (error) {
        console.error('Error during linkAccount event:', error);
      }
    },
    async signOut() {
      console.log('User signed out');
    },
  },
});

// Export handlers, signIn, signOut as-is
export const { handlers, signIn, signOut } = nextAuthConfig;

// Wrap auth function to support test mode with production safety check
export const auth = async () => {
  const isTestMode = process.env.E2E_TEST_MODE === 'true' &&
                     process.env.NODE_ENV !== 'production';

  if (isTestMode) {
    return {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return nextAuthConfig.auth();
};
