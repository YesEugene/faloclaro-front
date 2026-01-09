import { NextRequest, NextResponse } from 'next/server';

/**
 * Test email endpoint
 * 
 * Use this to test if Resend is configured correctly
 * 
 * Example:
 * curl -X POST http://localhost:3000/api/subscription/test-email \
 *   -H "Content-Type: application/json" \
 *   -d '{"email": "your-email@example.com"}'
 */

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { 
          error: 'RESEND_API_KEY not configured',
          message: 'Please add RESEND_API_KEY to your environment variables',
        },
        { status: 500 }
      );
    }

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Test Email from FaloClaro',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">✅ Resend работает!</h1>
            <p>Это тестовое письмо от FaloClaro.</p>
            <p>Если вы получили это письмо, значит:</p>
            <ul>
              <li>✅ Resend API ключ настроен правильно</li>
              <li>✅ Домен faloclaro.com верифицирован</li>
              <li>✅ DNS записи настроены корректно</li>
            </ul>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              FaloClaro - Изучайте португальский язык
            </p>
          </body>
        </html>
      `,
      text: `
✅ Resend работает!

Это тестовое письмо от FaloClaro.

Если вы получили это письмо, значит:
- Resend API ключ настроен правильно
- Домен faloclaro.com верифицирован
- DNS записи настроены корректно

FaloClaro - Изучайте португальский язык
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: error.message || error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: data?.id,
      to: email,
      from: fromEmail,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check Resend configuration
 */
export async function GET() {
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';

  return NextResponse.json({
    configured: hasApiKey,
    fromEmail,
    message: hasApiKey 
      ? 'Resend is configured. Use POST to send test email.'
      : 'RESEND_API_KEY is not set. Please add it to environment variables.',
  });
}






