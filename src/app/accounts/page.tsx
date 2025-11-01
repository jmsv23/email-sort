import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AccountsList from '@/components/AccountsList';

export default async function AccountsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get user's connected Gmail accounts with message counts
  const accounts = await prisma.account.findMany({
    where: {
      userId: session.user.id,
      provider: 'google',
    },
    select: {
      provider: true,
      providerAccountId: true,
      profile_id: true,
      createdAt: true,
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={session.user.email} userName={session.user.name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gmail Accounts</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your connected Gmail accounts. You can connect multiple accounts to organize emails from all your inboxes.
          </p>
        </div>

        <AccountsList initialAccounts={accounts} />

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">About Multiple Accounts</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Connect multiple Gmail accounts to manage all your emails in one place</li>
            <li>Each account maintains its own OAuth connection and refresh tokens</li>
            <li>Categories are shared across all your accounts</li>
            <li>Disconnecting an account will remove its messages from your dashboard</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
