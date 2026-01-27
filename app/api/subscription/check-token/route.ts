import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get('token') || '').trim();

    if (!token) {
      return NextResponse.json({ ok: false, exists: false, error: 'Missing token' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin
      .from('lesson_access_tokens')
      .select('user_id, lesson:lessons(day_number), expires_at')
      .eq('token', token)
      .limit(1)
      .maybeSingle();

    if (error || !row?.user_id) {
      return NextResponse.json({ ok: true, exists: false }, { status: 200 });
    }

    const expiresAt = row.expires_at ? new Date(String(row.expires_at)).getTime() : null;
    const now = Date.now();
    const isExpired = typeof expiresAt === 'number' ? expiresAt < now : false;

    return NextResponse.json(
      {
        ok: true,
        exists: true,
        isExpired,
        day: (row as any)?.lesson?.day_number ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, exists: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


