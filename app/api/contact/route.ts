import { NextRequest, NextResponse } from 'next/server';

function isValidEmail(email: string): boolean {
  const e = String(email || '').trim();
  if (!e) return false;
  // simple, pragmatic check
  return e.includes('@') && e.includes('.') && e.length <= 320;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim();
    const message = String(body?.message || '').trim();
    const lang = String(body?.lang || '').trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!message || message.length < 3) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }

    const to = process.env.RESEND_CONTACT_TO;
    if (!to) {
      return NextResponse.json({ error: 'RESEND_CONTACT_TO is not configured' }, { status: 500 });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';

    // Lazy init to avoid build failures when env vars are missing
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = `FaloClaro website message${lang ? ` (${lang})` : ''}`;
    const text = `New message from faloclaro.com\n\nFrom: ${email}\nLanguage: ${lang || '-'}\n\n${message}\n`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px 0;">New message from faloclaro.com</h2>
        <div style="margin: 0 0 12px 0;"><b>From:</b> ${email}</div>
        <div style="margin: 0 0 18px 0;"><b>Language:</b> ${lang || '-'}</div>
        <div style="white-space: pre-line; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px;">${message
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')}</div>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text,
      html,
      replyTo: email,
    });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to send' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


