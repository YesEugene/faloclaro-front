import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

/**
 * Create Stripe checkout session for course subscription
 * 
 * This is called when user wants to pay for full course after trial
 */

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
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured' },
        { status: 500 }
      );
    }

    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    const priceId = process.env.STRIPE_COURSE_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Course price not configured. Please create Stripe product first.' },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let customerId = subscription?.stripe_customer_id;

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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com'}/pt?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com'}/pt?payment=cancelled`,
      metadata: {
        user_id: userId,
        course_type: 'subscription',
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

