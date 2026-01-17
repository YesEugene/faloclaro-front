import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ success: false, error: 'Resend not configured' }, { status: 500 });
    }
    const resend = new Resend(resendKey);

    const body = await request.json();
    const { userId, lessonDay, token } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabase
      .from('subscription_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if ((userData as any)?.email_notifications_enabled === false) {
      return NextResponse.json({ success: true, skipped: true, message: 'Email notifications disabled' });
    }

    // Check if email was already sent for lesson 3 completion
    const { data: existingEmail } = await supabase
      .from('email_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'payment_reminder_lesson_3')
      .limit(1)
      .maybeSingle();

    if (existingEmail) {
      // Email already sent, don't send again
      return NextResponse.json({
        success: true,
        message: 'Email already sent',
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
    const paymentUrl = `${baseUrl}/pt/payment?day=4&token=${token || ''}`;

    const language = userData.language_preference || 'ru';
    const isRussian = language === 'ru';
    const isEnglish = language === 'en';

    const subject = isRussian
      ? 'Поздравляем! Вы завершили первые 3 урока'
      : isEnglish
      ? 'Congratulations! You\'ve completed the first 3 lessons'
      : 'Parabéns! Você completou as primeiras 3 lições';

    const htmlContent = isRussian
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px;">
            <h1 style="color: #059669; margin-bottom: 20px;">Поздравляем! 🎉</h1>
            
            <p>Мы видим, что вы завершили первые 3 урока курса FaloClaro. Надеемся, что вам понравилось!</p>
            
            <p>Если вы готовы продолжить обучение, то всего за <strong>€20</strong> вы получите:</p>
            
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;">✓ Доступ ко всем 60 урокам курса</li>
              <li style="margin: 10px 0;">✓ Будущие обновления и новые материалы</li>
              <li style="margin: 10px 0;">✓ Пожизненный доступ</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" style="background-color: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Оплатить €20 и продолжить обучение
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Если у вас есть вопросы, просто ответьте на это письмо.
            </p>
          </div>
        </body>
        </html>
      `
      : isEnglish
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px;">
            <h1 style="color: #059669; margin-bottom: 20px;">Congratulations! 🎉</h1>
            
            <p>We see that you've completed the first 3 lessons of the FaloClaro course. We hope you enjoyed them!</p>
            
            <p>If you're ready to continue learning, for just <strong>€20</strong> you'll get:</p>
            
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;">✓ Access to all 60 course lessons</li>
              <li style="margin: 10px 0;">✓ Future updates and new materials</li>
              <li style="margin: 10px 0;">✓ Lifetime access</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" style="background-color: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Pay €20 and continue learning
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you have any questions, just reply to this email.
            </p>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px;">
            <h1 style="color: #059669; margin-bottom: 20px;">Parabéns! 🎉</h1>
            
            <p>Vemos que você completou as primeiras 3 lições do curso FaloClaro. Esperamos que tenha gostado!</p>
            
            <p>Se você está pronto para continuar aprendendo, por apenas <strong>€20</strong> você terá:</p>
            
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;">✓ Acesso a todas as 60 lições do curso</li>
              <li style="margin: 10px 0;">✓ Atualizações futuras e novos materiais</li>
              <li style="margin: 10px 0;">✓ Acesso vitalício</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" style="background-color: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Pagar €20 e continuar aprendendo
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Se você tiver alguma dúvida, basta responder a este e-mail.
            </p>
          </div>
        </body>
        </html>
      `;

    const textContent = isRussian
      ? `Поздравляем! Мы видим, что вы завершили первые 3 урока курса FaloClaro. Надеемся, что вам понравилось!

Если вы готовы продолжить обучение, то всего за €20 вы получите:
- Доступ ко всем 60 урокам курса
- Будущие обновления и новые материалы
- Пожизненный доступ

Оплатить: ${paymentUrl}

Если у вас есть вопросы, просто ответьте на это письмо.`
      : isEnglish
      ? `Congratulations! We see that you've completed the first 3 lessons of the FaloClaro course. We hope you enjoyed them!

If you're ready to continue learning, for just €20 you'll get:
- Access to all 60 course lessons
- Future updates and new materials
- Lifetime access

Pay now: ${paymentUrl}

If you have any questions, just reply to this email.`
      : `Parabéns! Vemos que você completou as primeiras 3 lições do curso FaloClaro. Esperamos que tenha gostado!

Se você está pronto para continuar aprendendo, por apenas €20 você terá:
- Acesso a todas as 60 lições do curso
- Atualizações futuras e novos materiais
- Acesso vitalício

Pagar agora: ${paymentUrl}

Se você tiver alguma dúvida, basta responder a este e-mail.`;

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'FaloClaro <noreply@faloclaro.com>',
      to: userData.email,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Log email sent
    await supabase.from('email_logs').insert({
      user_id: userId,
      email_type: 'payment_reminder_lesson_3',
      sent_at: new Date().toISOString(),
      email_address: userData.email,
    });

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    });
  } catch (error: any) {
    console.error('Error in send-payment-email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

