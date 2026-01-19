import { NextRequest, NextResponse } from 'next/server';
import { markLearningActivityByToken, stopCampaign } from '@/lib/email-engine';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lessonToken = String(body?.lessonToken || '').trim();
    if (!lessonToken) {
      return NextResponse.json({ success: false, error: 'lessonToken is required' }, { status: 400 });
    }

    // Mark activity
    await markLearningActivityByToken(lessonToken);

    // Stop inactivity campaign immediately (so user won't get pending reminders)
    const supabase = getSupabaseAdmin();
    const { data: tokenRow } = await supabase
      .from('lesson_access_tokens')
      .select('user_id')
      .eq('token', lessonToken)
      .limit(1)
      .maybeSingle();
    if (tokenRow?.user_id) {
      await stopCampaign({ userId: tokenRow.user_id, campaignKey: 'campaign_neg_inactivity' });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


