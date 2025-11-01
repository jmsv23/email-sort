import { signOut } from '@/lib/auth';
import Link from 'next/link';

interface NavbarProps {
  userEmail?: string | null;
  userName?: string | null;
}

export default function Navbar({ userEmail, userName }: NavbarProps) {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
              Email Sort
            </Link>
            <div className="hidden sm:flex sm:gap-6">
              <Link
                href="/"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/accounts"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Accounts
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-gray-600">{userEmail}</span>
            )}
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/auth/signin' });
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
