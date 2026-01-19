import { NextRequest, NextResponse } from 'next/server';
import { runDispatcherOnce } from '@/lib/email-engine';

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_EMAIL_SECRET;
  if (!expected) return false;
  const got = req.headers.get('x-cron-secret') || '';
  return got === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const limit = Number(body?.limit || 50);
    const stats = await runDispatcherOnce(Number.isFinite(limit) ? limit : 50);
    return NextResponse.json({ success: true, stats });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


