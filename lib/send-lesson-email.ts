/**
 * Shared function for sending lesson emails
 * Can be called directly from other API routes without HTTP fetch
 */

import { supabase } from './supabase';
import crypto from 'crypto';

export async function sendLessonEmail(userId: string, lessonId: string, dayNumber: number) {
  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('subscription_users')
      .select('email, language_preference')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return { success: false, error: 'User not found' };
    }

    // Get lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('Error fetching lesson:', lessonError);
      return { success: false, error: 'Lesson not found' };
    }

    // Create or get access token
    let { data: tokenData, error: tokenError } = await supabase
      .from('lesson_access_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (tokenError && tokenError.code === 'PGRST116') {
      // Create new token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: createError } = await supabase
        .from('lesson_access_tokens')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          token,
          expires_at: expiresAt.toISOString(),
        });

      if (createError) {
        throw createError;
      }

      tokenData = { token };
    } else if (tokenError) {
      throw tokenError;
    }

    if (!tokenData || !tokenData.token) {
      return { success: false, error: 'Failed to create access token' };
    }

    const lessonUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com'}/pt/lesson/${dayNumber}/${tokenData.token}`;

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const emailContent = getEmailContent(lesson, user.language_preference, lessonUrl);
        
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';
        
        const { data, error } = await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (error) {
          console.error('Resend error:', error);
          return { success: false, error: error.message || 'Failed to send email' };
        }

        // Log email sent
        await supabase
          .from('email_logs')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            day_number: dayNumber,
            email_type: 'lesson',
          });

        return { success: true, emailId: data?.id, lessonUrl };
      } catch (err) {
        console.error('Error sending email:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    } else {
      console.warn('RESEND_API_KEY not configured. Email not sent.');
      return { success: false, error: 'Resend not configured' };
    }
  } catch (error) {
    console.error('Error in sendLessonEmail:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate email content based on language
 */
function getEmailContent(lesson: any, language: string, lessonUrl: string) {
  const dayInfo = lesson.yaml_content?.day || {};
  const emailInfo = lesson.yaml_content?.email || {};

  const translations = {
    ru: {
      subject: emailInfo.subject || `День ${lesson.day_number} из 60 — новый урок`,
      preview: emailInfo.preview || 'Короткий урок португальского',
      greeting: 'Привет!',
      message: `Сегодня у тебя новый урок: ${dayInfo.title || ''}`,
      cta: 'Начать урок',
      footer: 'Удачи в изучении португальского!',
    },
    en: {
      subject: emailInfo.subject || `Day ${lesson.day_number} of 60 — new lesson`,
      preview: emailInfo.preview || 'Short Portuguese lesson',
      greeting: 'Hello!',
      message: `Today you have a new lesson: ${dayInfo.title_en || dayInfo.title || ''}`,
      cta: 'Start lesson',
      footer: 'Good luck learning Portuguese!',
    },
    pt: {
      subject: emailInfo.subject || `Dia ${lesson.day_number} de 60 — nova lição`,
      preview: emailInfo.preview || 'Lição curta de português',
      greeting: 'Olá!',
      message: `Hoje tens uma nova lição: ${dayInfo.title_pt || dayInfo.title || ''}`,
      cta: 'Começar lição',
      footer: 'Boa sorte a aprender português!',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">${t.greeting}</h1>
        <p>${t.message}</p>
        <p style="color: #666;">${t.preview}</p>
        <div style="margin: 30px 0;">
          <a href="${lessonUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t.cta}
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">${t.footer}</p>
      </body>
    </html>
  `;

  const text = `
${t.greeting}

${t.message}

${t.preview}

${t.cta}: ${lessonUrl}

${t.footer}
  `;

  return {
    subject: t.subject,
    html,
    text,
  };
}

