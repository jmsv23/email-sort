import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CategoriesSection from '@/components/CategoriesSection';
import Navbar from '@/components/Navbar';
import { SyncButton } from '@/components/SyncButton';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <main className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">Email Sort</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            AI-Powered Gmail inbox management
          </p>
          <p className="text-gray-500 dark:text-gray-500">
            Redirecting to sign in...
          </p>
        </main>
      </div>
    );
  }

  // Get user's connected Gmail accounts
  const accounts = await prisma.account.findMany({
    where: {
      userId: session.user.id,
      provider: 'google',
    },
    select: {
      providerAccountId: true,
      profile_id: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={session.user.email} userName={session.user.name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Welcome, {session.user.name}!</h2>
          <p className="text-gray-600 mb-4">
            You have successfully connected your Google account.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Connected Gmail Accounts</h3>
            <SyncButton />
          </div>
          {accounts.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <li key={account.providerAccountId} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {account.profile_id || 'Gmail Account'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Connected {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No Gmail accounts connected yet.</p>
          )}
        </div>

        <div className="mt-6">
          <CategoriesSection />
        </div>
      </main>
    </div>
  );
}
