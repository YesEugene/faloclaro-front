import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Create Stripe product for 60-day Portuguese course subscription
 * 
 * This should be run once to create the product in Stripe.
 * After creation, save the product_id and price_id to environment variables.
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

    // Create product
    const product = await stripe.products.create({
      name: 'FaloClaro 60-Day Portuguese Course',
      description: 'Complete 60-day Portuguese language course with daily lessons',
      metadata: {
        course_type: 'subscription',
        duration_days: '60',
      },
    });

    // Create price (€20 one-time payment)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2000, // €20.00 in cents
      currency: 'eur',
      metadata: {
        course_type: 'subscription',
        duration_days: '60',
      },
    });

    return NextResponse.json({
      success: true,
      product_id: product.id,
      price_id: price.id,
      message: 'Product and price created successfully',
      instructions: [
        'Add these to your .env.local:',
        `STRIPE_COURSE_PRODUCT_ID=${product.id}`,
        `STRIPE_COURSE_PRICE_ID=${price.id}`,
      ],
    });
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    
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

/**
 * GET endpoint to check if product exists
 */
export async function GET(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured' },
        { status: 500 }
      );
    }

    const productId = process.env.STRIPE_COURSE_PRODUCT_ID;

    if (!productId) {
      return NextResponse.json({
        exists: false,
        message: 'Product ID not configured. Run POST to create product.',
      });
    }

    const product = await stripe.products.retrieve(productId);

    return NextResponse.json({
      exists: true,
      product_id: product.id,
      name: product.name,
      description: product.description,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
      return NextResponse.json({
        exists: false,
        message: 'Product not found in Stripe',
      });
    }

    console.error('Error checking Stripe product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

