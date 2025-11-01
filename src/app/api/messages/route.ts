import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const accountId = searchParams.get('accountId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: any = {
      account: {
        userId: session.user.id,
      },
    };

    if (categoryId && categoryId !== 'all') {
      whereClause.categoryId = categoryId;
    }

    if (accountId && accountId !== 'all') {
      whereClause.provider = 'google';
      whereClause.providerAccountId = accountId;
    }

    // Fetch messages with related data
    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
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
            },
          },
        },
        orderBy: {
          importedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
