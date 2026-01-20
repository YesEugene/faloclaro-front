import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildDefaultVarsForUser, computeWeeklyStats, renderEmailHtml, renderPlaceholders } from '@/lib/email-engine';

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to = String(body?.to || '').trim();
    const templateKey = String(body?.templateKey || '').trim();
    const lang = (String(body?.lang || 'ru').trim() === 'en' ? 'en' : 'ru') as 'ru' | 'en';
    const statsUserEmail = String(body?.statsUserEmail || '').trim();
    if (!to || !to.includes('@') || !templateKey) {
      return NextResponse.json({ success: false, error: 'to and templateKey are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: tpl, error: tplErr } = await supabase.from('email_templates').select('*').eq('key', templateKey).limit(1).maybeSingle();
    if (tplErr) throw tplErr;
    if (!tpl) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });

    // Default: mock vars for preview.
    let vars: any = {
      intro_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com'}/pt/intro`,
      payment_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com'}/pt/payment`,
      weekly_lessons_completed: 2,
      weekly_topics: 'Урок 1: Пример; Урок 2: Пример',
      total_words_learned: 120,
      module_label_ru: 'Модуль 1 (A1)',
      module_label_en: 'Module 1 (A1)',
    };

    // If statsUserEmail provided: compute real vars from that user, but still send to `to`.
    if (statsUserEmail && statsUserEmail.includes('@')) {
      const { data: u } = await supabase
        .from('subscription_users')
        .select('id')
        .ilike('email', statsUserEmail)
        .limit(1)
        .maybeSingle();
      if (u?.id) {
        const base = await buildDefaultVarsForUser(u.id);
        vars = { ...vars, ...base };
        const stats = await computeWeeklyStats(u.id);
        vars.weekly_lessons_completed = stats.weeklyLessonsCompleted;
        vars.weekly_topics = stats.weeklyTopics || (lang === 'en' ? 'No completed lessons this week' : 'Нет завершённых уроков за неделю');
        vars.total_words_learned = stats.totalWordsLearned;
        vars.words_preview = (stats.wordsPreview || []).join('|');
      }
    }

    const subjectRaw = lang === 'en' ? tpl.subject_en : tpl.subject_ru;
    const bodyRaw = lang === 'en' ? tpl.body_en : tpl.body_ru;
    const ctaTextRaw = lang === 'en' ? tpl.cta_text_en : tpl.cta_text_ru;

    const subject = renderPlaceholders(subjectRaw, vars);
    const bodyText = renderPlaceholders(bodyRaw, vars);
    const ctaEnabled = !!tpl.cta_enabled && !!tpl.cta_url_template;
    const ctaUrl = ctaEnabled ? renderPlaceholders(tpl.cta_url_template, vars) : null;
    const ctaText = ctaEnabled ? renderPlaceholders(ctaTextRaw || '', vars) : null;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const rendered = renderEmailHtml({
      templateKey,
      lang,
      subject,
      bodyText,
      ctaEnabled,
      ctaText,
      ctaUrl,
      vars,
    });

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `[TEST] ${subject}`,
      html: rendered.html,
      text: rendered.text,
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message || 'Failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


