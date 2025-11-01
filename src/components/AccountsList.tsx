'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface Account {
  provider: string;
  providerAccountId: string;
  profile_id: string | null;
  createdAt: Date;
  _count: {
    messages: number;
  };
}

interface AccountsListProps {
  initialAccounts: Account[];
}

export default function AccountsList({ initialAccounts }: AccountsListProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();

  const handleConnectAccount = async () => {
    try {
      setIsConnecting(true);

      // Use NextAuth's signIn which automatically handles account linking
      // when user is already authenticated
      await signIn('google', {
        callbackUrl: '/accounts',
      });
    } catch (error) {
      console.error('Error connecting account:', error);
      alert('An unexpected error occurred');
      setIsConnecting(false);
    }
  };

  const handleDisconnectAccount = async (providerAccountId: string, profileId: string | null) => {
    if (accounts.length === 1) {
      alert('You cannot disconnect your last account. Please connect another account first.');
      return;
    }

    const confirmMessage = `Are you sure you want to disconnect ${profileId || 'this account'}? All messages from this account will be removed.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/accounts/${providerAccountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to disconnect account');
        return;
      }

      // Remove account from UI
      setAccounts(accounts.filter(acc => acc.providerAccountId !== providerAccountId));

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('An unexpected error occurred');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          <button
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : 'Connect Another Account'}
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <div key={account.providerAccountId} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {account.profile_id || 'Gmail Account'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Connected {new Date(account.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                      <span className="text-xs text-gray-500">
                        {account._count.messages} {account._count.messages === 1 ? 'message' : 'messages'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnectAccount(account.providerAccountId, account.profile_id)}
                  className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">No accounts connected yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
