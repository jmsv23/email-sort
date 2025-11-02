import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/Navbar';
import MessageDetailActions from '@/components/MessageDetailActions';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function MessageDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  const message = await prisma.message.findFirst({
    where: {
      id: id,
      account: {
        userId: session.user.id,
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      account: {
        select: {
          provider: true,
          providerAccountId: true,
          profile_id: true,
          userId: true,
        },
      },
    },
  });

  if (!message) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userEmail={session.user.email!} userName={session.user.name} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900">Message Not Found</h1>
            <p className="mt-2 text-gray-600">
              The message you're looking for doesn't exist or has been deleted.
            </p>
            <a
              href="/"
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </a>
          </div>
        </main>
      </div>
    );
  }

  // Format date
  const formattedDate = new Date(message.importedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={session.user.email!} userName={session.user.name} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Actions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <a
                href="/"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Messages
              </a>
              <MessageDetailActions
                messageId={message.id}
                unsubscribeLink={message.unsubscribeLink}
                isUnsubscribed={message.unsubscribed}
                unsubscribedReason={message.unsubscribedReason}
              />
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Subject */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">
              {message.subject || '(No Subject)'}
            </h1>
          </div>

          {/* Metadata */}
          <div className="p-6 border-b border-gray-200 space-y-3">
            <div className="flex items-start">
              <span className="text-sm font-semibold text-gray-700 w-20">From:</span>
              <span className="text-sm text-gray-900">{message.from || 'Unknown'}</span>
            </div>
            <div className="flex items-start">
              <span className="text-sm font-semibold text-gray-700 w-20">To:</span>
              <span className="text-sm text-gray-900">{message.to || 'Unknown'}</span>
            </div>
            <div className="flex items-start">
              <span className="text-sm font-semibold text-gray-700 w-20">Date:</span>
              <span className="text-sm text-gray-900">{formattedDate}</span>
            </div>
            <div className="flex items-start">
              <span className="text-sm font-semibold text-gray-700 w-20">Account:</span>
              <span className="text-sm text-gray-900">
                {message.account.provider} ({message.account.profile_id || message.account.providerAccountId})
              </span>
            </div>
            {message.category && (
              <div className="flex items-start">
                <span className="text-sm font-semibold text-gray-700 w-20">Category:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {message.category.name}
                </span>
              </div>
            )}
            {message.threadId && (
              <div className="flex items-start">
                <span className="text-sm font-semibold text-gray-700 w-20">Thread ID:</span>
                <span className="text-xs text-gray-500 font-mono">{message.threadId}</span>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {message.aiSummary && (
            <div className="p-6 border-b border-gray-200 bg-blue-50">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">AI Summary</h2>
              <p className="text-sm text-gray-900">{message.aiSummary}</p>
            </div>
          )}

          {/* Email Body */}
          <div className="p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Message Content</h2>
            {message.bodyHtml ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
            ) : message.bodyText ? (
              <div className="whitespace-pre-wrap text-sm text-gray-900 font-mono bg-gray-50 p-4 rounded-lg">
                {message.bodyText}
              </div>
            ) : message.snippet ? (
              <div className="text-sm text-gray-600 italic">
                {message.snippet}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No content available
              </div>
            )}
          </div>

          {/* Additional Metadata (collapsed by default) */}
          <details className="p-6 border-t border-gray-200">
            <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
              Technical Details
            </summary>
            <div className="mt-4 space-y-2 text-xs text-gray-600">
              <div>
                <span className="font-semibold">Message ID:</span>{' '}
                <span className="font-mono">{message.id}</span>
              </div>
              <div>
                <span className="font-semibold">Gmail Message ID:</span>{' '}
                <span className="font-mono">{message.gmailMessageId}</span>
              </div>
              {message.listUnsubscribeHeader && (
                <div>
                  <span className="font-semibold">List-Unsubscribe Header:</span>{' '}
                  <span className="font-mono break-all">{message.listUnsubscribeHeader}</span>
                </div>
              )}
              <div>
                <span className="font-semibold">Archived:</span>{' '}
                <span>{message.archived ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-semibold">Unsubscribed:</span>{' '}
                <span>{message.unsubscribed ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
