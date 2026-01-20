import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildDefaultVarsForUser, computeWeeklyStats, renderPlaceholders } from '@/lib/email-engine';

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildWeeklyStatsHtml(input: {
  title: string;
  lang: 'ru' | 'en';
  lessonsCompleted: number;
  totalWordsLearned: number;
  tags: string[];
  topics: string[];
  footerText: string;
  ctaUrl?: string | null;
  ctaText?: string | null;
}): string {
  const topicsHtml = input.topics.length
    ? `<ul style="margin: 10px 0 0 18px; padding: 0;">${input.topics
        .map((t) => `<li style="margin: 6px 0;">${escapeHtml(t)}</li>`)
        .join('')}</ul>`
    : `<div style="color:#666;margin-top:10px;">—</div>`;

  // Gmail-friendly: avoid flexbox; use inline-block tags.
  const tagsHtml = input.tags.length
    ? `<div style="font-size:0; text-align:right; max-width: 320px;">
        ${input.tags
          .slice(0, 20)
          .map(
            (w) =>
              `<span style="display:inline-block;background:#fff;color:#111;border-radius:999px;padding:6px 10px;margin:0 0 8px 8px;font-size:12px;font-weight:700;line-height:1;white-space:nowrap;">${escapeHtml(
                w
              )}</span>`
          )
          .join('')}
       </div>`
    : '';

  const labelLessons = input.lang === 'en' ? 'Lessons<br/>completed' : 'Уроков<br/>пройдено';
  const labelWords = input.lang === 'en' ? 'New<br/>words' : 'Новых<br/>слов';
  const topicsTitle = input.lang === 'en' ? 'Completed lesson topics' : 'Пройденные темы уроков';

  return `
    <div style="font-family: Inter, Arial, sans-serif; color:#111; max-width: 720px; margin: 0 auto; padding: 22px;">
      <div style="font-size: 22px; font-weight: 800; margin-bottom: 14px;">${escapeHtml(input.title)}</div>
      <div style="height:1px;background:#E6E8EB;margin: 12px 0 18px;"></div>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
        <tr>
          <td valign="top" style="width:220px; background:#7CF0A0; border-radius:22px; padding:18px 18px; overflow:hidden;">
            <div style="font-size: 52px; font-weight: 900; line-height: 1;">${escapeHtml(String(input.lessonsCompleted))}</div>
            <div style="font-size: 22px; font-weight: 800; margin-top: 8px; line-height: 1.05;">${labelLessons}</div>
          </td>
          <td style="width:20px; font-size:0; line-height:0;">&nbsp;</td>
          <td valign="top">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
              <tr>
                <td valign="top" style="background:#B277FF; border-radius:22px; padding:18px 18px; color:#fff; overflow:hidden;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
                    <tr>
                      <td valign="top" style="width:150px;">
                        <div style="font-size: 52px; font-weight: 900; line-height: 1;">${escapeHtml(String(input.totalWordsLearned))}</div>
                        <div style="font-size: 22px; font-weight: 800; margin-top: 8px; line-height: 1.05;">${labelWords}</div>
                      </td>
                      <td valign="top" style="text-align:right;">
                        ${tagsHtml}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="margin-top: 16px; background:#fff; border: 1px solid #111; border-radius: 22px; padding: 18px;">
        <div style="font-size: 26px; font-weight: 900; margin-bottom: 10px;">${escapeHtml(topicsTitle)}</div>
        ${topicsHtml}
      </div>

      <div style="height:1px;background:#E6E8EB;margin: 18px 0 18px;"></div>
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">${escapeHtml(input.footerText)}</div>
      ${
        input.ctaUrl
          ? `<a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:800;">
              ${escapeHtml(input.ctaText || '')}
            </a>`
          : ''
      }
    </div>
  `;
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

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 640px; margin: 0 auto; padding: 20px;">
        <div style="white-space: pre-line;">${escapeHtml(bodyText)}</div>
        ${
          ctaEnabled && ctaUrl
            ? `<div style="margin-top: 24px;">
                 <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
                   ${escapeHtml(ctaText || '')}
                 </a>
               </div>`
            : ''
        }
      </div>
    `;

    const finalHtml =
      templateKey === 'core_weekly_stats'
        ? buildWeeklyStatsHtml({
            title: subject,
            lang,
            lessonsCompleted: Number(vars.weekly_lessons_completed || 0),
            totalWordsLearned: Number(vars.total_words_learned || 0),
            tags: String(vars.words_preview || '')
              .split('|')
              .map((x) => x.trim())
              .filter(Boolean),
            topics: String(vars.weekly_topics || '')
              .split(';')
              .map((x) => x.trim())
              .filter(Boolean),
            footerText: bodyText.split('\n').slice(-1)[0] || bodyText,
            ctaUrl: ctaEnabled ? ctaUrl : null,
            ctaText: ctaEnabled ? ctaText : null,
          })
        : html;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `[TEST] ${subject}`,
      html: finalHtml,
      text: bodyText + (ctaEnabled && ctaUrl ? `\n\n${ctaText || ''}: ${ctaUrl}` : ''),
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message || 'Failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


