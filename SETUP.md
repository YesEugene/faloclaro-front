# FaloClaro Setup Guide

This guide will help you set up FaloClaro as a completely separate project from FlipTrip.

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose a name (e.g., "FaloClaro")
4. Set a database password (save it securely)
5. Choose a region close to your users
6. Wait for the project to be created

## Step 2: Set Up Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `database/schema.sql`
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Verify tables were created: Go to **Table Editor** and you should see:
   - `clusters`
   - `phrases`
   - `translations`

## Step 3: Get Supabase Credentials

1. In Supabase, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 4: Configure Environment Variables

1. In the project root, create `.env.local`:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a **new repository**
2. Name it `faloclaro-app` (or your preferred name)
3. **Do NOT initialize with README** (we already have one)
4. Copy the repository URL

## Step 6: Initialize Git and Push

```bash
cd "/Users/yes/Downloads/YES PROJECTS/FaloClaro/faloclaro-app"
git add .
git commit -m "Initial commit: FaloClaro Portuguese learning app"
git branch -M main
git remote add origin https://github.com/yourusername/faloclaro-app.git
git push -u origin main
```

## Step 7: Set Up Vercel Deployment

1. Go to [https://vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your `faloclaro-app` repository
5. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
6. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
7. Click "Deploy"

## Step 8: Set Up Audio Storage (Supabase Storage)

1. In Supabase, go to **Storage**
2. Click "Create a new bucket"
3. Name: `audio`
4. **Make it public** (toggle "Public bucket")
5. Click "Create bucket"

### Upload Audio Files

1. Click on the `audio` bucket
2. Click "Upload file" or drag and drop
3. Upload your pre-generated audio files (MP3 format recommended)
4. After upload, click on a file to get its public URL
5. The URL format will be: `https://your-project.supabase.co/storage/v1/object/public/audio/filename.mp3`

## Step 9: Add Sample Data

You can add sample data via Supabase Table Editor or SQL:

### Add a Cluster

```sql
INSERT INTO clusters (name, description, order_index)
VALUES ('Greetings', 'Common greetings and introductions', 1);
```

### Add a Phrase

```sql
INSERT INTO phrases (cluster_id, portuguese_text, ipa_transcription, audio_url, order_index)
VALUES (
  'your-cluster-id-here',
  'Olá, como está?',
  'ˈɔlɐ ˈkomu ɨʃˈta',
  'https://your-project.supabase.co/storage/v1/object/public/audio/ola-como-esta.mp3',
  1
);
```

### Add a Translation

```sql
INSERT INTO translations (phrase_id, language_code, translation_text)
VALUES (
  'your-phrase-id-here',
  'en',
  'Hello, how are you?'
);
```

## Step 10: Test the Application

1. Run locally:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000)
3. You should be redirected to `/clusters`
4. Test the flow:
   - Select clusters
   - View phrases
   - Play audio in the player

## Verification Checklist

- [ ] Supabase project created (separate from FlipTrip)
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] GitHub repository created and code pushed
- [ ] Vercel project created and deployed
- [ ] Audio storage bucket created
- [ ] Sample data added
- [ ] Application tested locally
- [ ] Application tested on Vercel deployment

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env.local` exists and has correct values
- Restart the dev server after changing `.env.local`

### "Error loading clusters"
- Verify Supabase credentials are correct
- Check that RLS policies are set (they should be in schema.sql)
- Verify tables exist in Supabase Table Editor

### Audio not playing
- Check that audio URLs are correct and accessible
- Verify the `audio` bucket is public
- Test the audio URL directly in a browser

### CORS errors
- Supabase should handle CORS automatically
- If issues persist, check Supabase project settings

## Next Steps

- Add more clusters and phrases
- Generate audio files for all phrases
- Add translations in multiple languages
- Customize the donation link in `app/methodology/page.tsx`








