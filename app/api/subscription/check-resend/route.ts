import { NextRequest, NextResponse } from 'next/server';

/**
 * Check Resend configuration and test connection
 */

export async function GET() {
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';
  const apiKeyPrefix = process.env.RESEND_API_KEY 
    ? `${process.env.RESEND_API_KEY.substring(0, 7)}...${process.env.RESEND_API_KEY.substring(process.env.RESEND_API_KEY.length - 4)}`
    : 'not set';

  // Try to initialize Resend to check if it works
  let resendInitialized = false;
  let resendError = null;

  if (hasApiKey) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      resendInitialized = true;
    } catch (err) {
      resendError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  return NextResponse.json({
    configured: hasApiKey,
    apiKeyPrefix,
    fromEmail,
    resendInitialized,
    resendError,
    message: hasApiKey 
      ? (resendInitialized 
          ? 'Resend is configured and initialized correctly. Check logs for email sending details.'
          : `Resend key exists but initialization failed: ${resendError}`)
      : 'RESEND_API_KEY is not set. Please add it to environment variables in Vercel.',
    instructions: [
      '1. Check Vercel Environment Variables: Settings → Environment Variables',
      '2. Ensure RESEND_API_KEY is set for Production environment',
      '3. Verify domain in Resend Dashboard: https://resend.com/domains',
      '4. Check Resend logs: https://resend.com/emails',
    ],
  });
}






