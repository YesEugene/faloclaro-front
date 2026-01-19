import { NextRequest, NextResponse } from 'next/server';
import { runDispatcherOnce } from '@/lib/email-engine';

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_EMAIL_SECRET;

  // If a secret is configured, require it (header or query param).
  if (expected) {
    const gotHeader = req.headers.get('x-cron-secret') || '';
    if (gotHeader === expected) return true;
    const url = new URL(req.url);
    const gotQuery = url.searchParams.get('secret') || '';
    if (gotQuery === expected) return true;
    return false;
  }

  // If no secret is configured, allow Vercel cron calls.
  // (Vercel cron requests include x-vercel-cron header.)
  const vercelCron = req.headers.get('x-vercel-cron');
  if (process.env.VERCEL && vercelCron) return true;

  return false;
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


