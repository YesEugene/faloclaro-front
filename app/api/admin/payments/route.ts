import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get all subscriptions with payment info (paid subscriptions)
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        user:subscription_users!subscriptions_user_id_fkey (
          email
        )
      `)
      .in('status', ['paid', 'active'])
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    // Transform subscription data to payment format
    const payments = (subscriptions || []).map((sub: any) => {
      // Get user email from joined data or from subscription_users relation
      const userEmail = sub.user?.email || 
                       (Array.isArray(sub.user) && sub.user[0]?.email) || 
                       '';

      return {
        id: sub.id,
        user_id: sub.user_id,
        user_email: userEmail,
        amount: sub.amount_paid || null, // Amount in cents (if stored)
        currency: sub.currency || 'EUR',
        status: sub.status,
        stripe_payment_intent_id: sub.stripe_payment_intent_id || sub.stripe_subscription_id || null,
        stripe_session_id: sub.stripe_session_id || null,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
        trial_started_at: sub.trial_started_at,
        trial_ends_at: sub.trial_ends_at,
      };
    });

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

