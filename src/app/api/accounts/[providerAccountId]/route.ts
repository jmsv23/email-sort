import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/accounts/[providerAccountId] - Disconnect a Gmail account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerAccountId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { providerAccountId } = await params;

    // Check if account exists and belongs to the user
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if this is the user's last account
    const accountCount = await prisma.account.count({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (accountCount === 1) {
      return NextResponse.json(
        { error: 'Cannot disconnect your last account' },
        { status: 400 }
      );
    }

    // Delete the account (messages will be cascaded deleted due to onDelete: Cascade in schema)
    await prisma.account.delete({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
