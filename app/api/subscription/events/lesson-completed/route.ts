import { NextRequest, NextResponse } from 'next/server';
import { buildDefaultVarsForUser, computeModuleInfo, enrollCampaign, sendTemplateEmail, stopCampaign } from '@/lib/email-engine';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function moduleBounds(moduleNumber: number): { start: number; end: number } {
  if (moduleNumber === 1) return { start: 1, end: 14 };
  if (moduleNumber === 2) return { start: 15, end: 30 };
  if (moduleNumber === 3) return { start: 31, end: 45 };
  return { start: 46, end: 60 };
}

async function hasPaidAccess(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, paid_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return !!(sub?.paid_at || sub?.status === 'paid' || sub?.status === 'active');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lessonToken = String(body?.lessonToken || '').trim();
    const dayNumber = Number(body?.dayNumber);
    if (!lessonToken || !Number.isFinite(dayNumber)) {
      return NextResponse.json({ success: false, error: 'lessonToken and dayNumber are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: tokenRow } = await supabase
      .from('lesson_access_tokens')
      .select('user_id')
      .eq('token', lessonToken)
      .limit(1)
      .maybeSingle();
    const userId = tokenRow?.user_id as string | undefined;
    if (!userId) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });

    // Activity is updated by /api/subscription/activity on each task completion.
    // But in case client calls only lesson-completed, still stop inactivity.
    await stopCampaign({ userId, campaignKey: 'campaign_neg_inactivity' });

    const vars = await buildDefaultVarsForUser(userId);

    // Day 3: congrats + enroll payment reminders (only if not paid)
    if (dayNumber === 3) {
      const paid = await hasPaidAccess(userId);
      if (!paid) {
        await sendTemplateEmail({
          userId,
          templateKey: 'core_day3_congrats',
          vars,
          dayNumber: 3,
        });
        await enrollCampaign({
          userId,
          campaignKey: 'campaign_neg_no_payment_after_day3',
          context: { day_number: 3 },
        });
      } else {
        await stopCampaign({ userId, campaignKey: 'campaign_neg_no_payment_after_day3' });
      }
    }

    // Module completion check only on last day of module
    const modInfo = computeModuleInfo(dayNumber);
    if (modInfo) {
      const bounds = moduleBounds(modInfo.moduleNumber);
      if (dayNumber === bounds.end) {
        const { data: completedProgress } = await supabase
          .from('user_progress')
          .select('day_number')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .gte('day_number', bounds.start)
          .lte('day_number', bounds.end);
        const set = new Set<number>(((completedProgress as any[]) || []).map((r) => Number(r.day_number)));
        let ok = true;
        for (let d = bounds.start; d <= bounds.end; d++) {
          if (!set.has(d)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          await sendTemplateEmail({
            userId,
            templateKey: 'core_module_complete',
            vars: {
              ...vars,
              module_label_ru: modInfo.moduleLabelRu,
              module_label_en: modInfo.moduleLabelEn,
            },
            dayNumber,
          });
          if (dayNumber === 60) {
            await sendTemplateEmail({ userId, templateKey: 'core_course_complete', vars, dayNumber: 60 });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


