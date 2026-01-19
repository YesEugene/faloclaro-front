import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildDefaultVarsForUser, sendTemplateEmail } from '@/lib/email-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Set subscription back to trial-like state (limits to first 3 lessons)
    await supabase
      .from('subscriptions')
      .update({
        status: 'trial',
        paid_at: null,
        expires_at: null,
      })
      .eq('user_id', userId);

    // Delete access tokens for lessons > 3 so CourseMenuDrawer locks them
    const { data: lessonsToLock } = await supabase
      .from('lessons')
      .select('id')
      .gt('day_number', 3);
    const ids = (lessonsToLock || []).map((l: any) => l.id);
    if (ids.length) {
      await supabase.from('lesson_access_tokens').delete().eq('user_id', userId).in('lesson_id', ids);
    }

    // Notify user
    try {
      const vars = await buildDefaultVarsForUser(userId);
      await sendTemplateEmail({ userId, templateKey: 'admin_course_revoked', vars, dayNumber: 0 });
    } catch (e) {
      // non-blocking
      console.warn('Failed to send revoke email:', e);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


