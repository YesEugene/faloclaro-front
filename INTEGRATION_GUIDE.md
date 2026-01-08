# Integration Guide - Subscription Course

## 1. ✅ Database Setup
Схема БД создана и урок импортирован.

## 2. Resend Email Integration

### Setup Steps:

1. **Install Resend:**
```bash
npm install resend
```

2. **Get API Key:**
- Sign up at https://resend.com
- Create API key in dashboard
- Add to `.env.local`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

3. **Configure Domain:**
- Add your domain in Resend dashboard
- Verify DNS records
- Update `from` email in `app/api/subscription/send-lesson-email/route.ts`

4. **Uncomment Resend Code:**
- Open `app/api/subscription/send-lesson-email/route.ts`
- Uncomment the Resend integration code (marked with `TODO`)
- Update `from` email address

5. **Test Email:**
```bash
# Test via API
curl -X POST http://localhost:3000/api/subscription/send-lesson-email \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "lessonId": "...", "dayNumber": 1}'
```

## 3. Stripe Product Setup

### Create Product:

1. **Run API endpoint to create product:**
```bash
curl -X POST http://localhost:3000/api/subscription/create-stripe-product
```

2. **Save the response:**
```json
{
  "product_id": "prod_xxxxx",
  "price_id": "price_xxxxx"
}
```

3. **Add to `.env.local`:**
```
STRIPE_COURSE_PRODUCT_ID=prod_xxxxx
STRIPE_COURSE_PRICE_ID=price_xxxxx
```

4. **Verify product exists:**
```bash
curl http://localhost:3000/api/subscription/create-stripe-product
```

### Webhook Setup:

1. **Install Stripe CLI:**
```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

2. **Get webhook secret:**
- Copy the webhook signing secret from Stripe CLI output
- Add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

3. **For Production:**
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://www.faloclaro.com/api/subscription/webhook`
- Select events: `checkout.session.completed`, `payment_intent.succeeded`
- Copy webhook signing secret to production environment

## 4. Testing Flow

### Registration Flow:
1. User enters email on `/pt`
2. API creates user and trial subscription
3. API generates access token
4. API sends email with lesson link (when Resend configured)

### Lesson Access:
1. User clicks link: `/pt/lesson/1/[token]`
2. System verifies token
3. User sees lesson with tasks
4. Progress is tracked in database

### Payment Flow:
1. After 3 days, show payment prompt
2. User clicks "Continue Course"
3. API creates Stripe checkout session
4. User pays €20
5. Webhook updates subscription to `active`
6. User gets access to all 60 lessons

## 5. Environment Variables

Add to `.env.local`:

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Stripe (already configured)
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_COURSE_PRODUCT_ID=prod_xxxxx
STRIPE_COURSE_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App URL
NEXT_PUBLIC_APP_URL=https://www.faloclaro.com
```

## 6. Next Steps

- [ ] Configure Resend and test email sending
- [ ] Create Stripe product via API
- [ ] Set up webhook endpoint
- [ ] Add payment prompt UI after trial expires
- [ ] Test complete user flow

