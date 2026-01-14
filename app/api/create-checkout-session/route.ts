import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  return new Stripe(key, {
    apiVersion: '2025-12-15.clover',
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, day, token } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe secret key not configured' },
        { status: 500 }
      );
    }

    // Get user ID from token if provided
    let userId: string | null = null;
    if (token) {
      const { data: tokenData } = await supabase
        .from('lesson_access_tokens')
        .select('user_id')
        .eq('token', token)
        .single();
      
      if (tokenData) {
        userId = tokenData.user_id;
      }
    }

    // If no userId from token, try to get from email
    if (!userId) {
      const { data: userData } = await supabase
        .from('subscription_users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (userData) {
        userId = userData.id;
      }
    }

    const priceId = process.env.STRIPE_COURSE_PRICE_ID;

    // If priceId is configured, use it; otherwise use price_data
    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'FaloClaro - Full Course Access',
                description: 'Access to all 60 lessons and future updates',
              },
              unit_amount: 2000, // €20.00 in cents
            },
            quantity: 1,
          },
        ];

    // Get or create Stripe customer
    let customerId: string | undefined;
    if (userId) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      customerId = subscription?.stripe_customer_id;

      if (!customerId) {
        // Create Stripe customer
        const customer = await stripe.customers.create({
          email,
          metadata: {
            user_id: userId,
          },
        });

        customerId = customer.id;

        // Update subscription with customer ID
        await supabase
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
    const successUrl = `${baseUrl}/pt?payment=success`;
    const cancelUrl = `${baseUrl}/pt/payment?day=${day || ''}&token=${token || ''}`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...(userId ? { user_id: userId } : {}),
        email,
        day: day || '',
        token: token || '',
        course_type: 'subscription',
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
