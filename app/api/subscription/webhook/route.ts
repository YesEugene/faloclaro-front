import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

/**
 * Stripe webhook handler for course payment
 * 
 * Handles:
 * - checkout.session.completed - Payment successful
 * - payment_intent.succeeded - Payment confirmed
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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (userId) {
          // Update subscription to active/paid
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 365); // 1 year from payment

          await supabase
            .from('subscriptions')
            .update({
              status: 'paid', // Changed from 'active' to 'paid' for one-time payment
              paid_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              stripe_subscription_id: session.id,
            })
            .eq('user_id', userId);

          // Create access tokens for all lessons (4-60) if they don't exist
          const { data: allLessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('id, day_number')
            .gte('day_number', 4) // Lessons 4-60
            .order('day_number', { ascending: true });

          if (!lessonsError && allLessons) {
            // Get existing tokens for this user
            const { data: existingTokens, error: tokensError } = await supabase
              .from('lesson_access_tokens')
              .select('lesson_id')
              .eq('user_id', userId);

            const existingLessonIds = new Set(
              (existingTokens || []).map(t => t.lesson_id)
            );

            // Create tokens for lessons that don't have them
            const tokensToCreate = allLessons
              .filter(lesson => !existingLessonIds.has(lesson.id))
              .map(lesson => ({
                user_id: userId,
                lesson_id: lesson.id,
                token: crypto.randomBytes(32).toString('hex'),
                expires_at: expiresAt.toISOString(),
              }));

            if (tokensToCreate.length > 0) {
              const { error: createError } = await supabase
                .from('lesson_access_tokens')
                .insert(tokensToCreate);

              if (createError) {
                console.error('Error creating lesson tokens:', createError);
              } else {
                console.log(`Created ${tokensToCreate.length} lesson access tokens for user ${userId}`);
              }
            }
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Additional handling if needed
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

