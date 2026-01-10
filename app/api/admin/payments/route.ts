import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get all subscriptions with payment info
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        user:subscription_users (
          email
        )
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    // Get Stripe payment intents if they exist in the database
    // Note: You may need to create a table to store Stripe payment information
    // For now, we'll use subscription data as payment information

    const payments = (subscriptions || []).map((sub: any) => ({
      id: sub.id,
      user_id: sub.user_id,
      user_email: sub.user?.email || '',
      amount: sub.amount_paid || null, // Amount in cents
      currency: sub.currency || 'EUR',
      status: sub.status,
      stripe_payment_intent_id: sub.stripe_payment_intent_id || null,
      stripe_session_id: sub.stripe_session_id || null,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
    }));

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

