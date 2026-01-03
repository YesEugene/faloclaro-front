# FaloClaro - Learn European Portuguese

A web application for learning European Portuguese (pt-PT) through repetition of high-frequency sentences.

## Core Principles

- Learning through listening + repeating full sentences
- No on-the-fly generation of audio or translations
- All content is pre-generated, stored, and cached
- User controls repetition, speed, and pacing

## Tech Stack

- **Frontend**: Next.js 16 (App Router)
- **Deployment**: Vercel
- **Database & Storage**: Supabase
- **Audio**: Pre-generated neural TTS (pt-PT)

## Setup Instructions

### 1. Supabase Setup (New Project)

1. Go to [Supabase](https://app.supabase.com) and create a **new project** (separate from FlipTrip)
2. In the SQL Editor, run the schema from `database/schema.sql`
3. Go to Settings → API and copy:
   - Project URL
   - `anon` `public` key

### 2. Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. GitHub Setup (New Repository)

1. Create a **new repository** on GitHub (e.g., `faloclaro-app`)
2. Initialize and push:

```bash
git remote add origin https://github.com/yourusername/faloclaro-app.git
git branch -M main
git push -u origin main
```

### 4. Vercel Setup (New Project)

1. Go to [Vercel](https://vercel.com) and create a **new project**
2. Import your GitHub repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### 5. Audio Files

Upload pre-generated audio files to Supabase Storage:
1. Create a bucket named `audio` (public)
2. Upload audio files (MP3 format recommended)
3. Update `phrases.audio_url` in the database with the public URLs

## Database Schema

- **clusters**: Learning scope categories
- **phrases**: Portuguese sentences with audio URLs
- **translations**: Multi-language translations

See `database/schema.sql` for the complete schema.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  clusters/      # Screen 1: Cluster selection
  phrases/       # Screen 2: Phrase list
  player/        # Screen 3: Audio player (core)
  methodology/   # Screen 4: Method explanation + donation
lib/
  supabase.ts    # Supabase client
database/
  schema.sql     # Database schema
types/
  index.ts       # TypeScript types
```

## Important Notes

- This is a **completely separate project** from FlipTrip
- Uses its own Supabase project, GitHub repo, and Vercel deployment
- No user authentication required (v1)
- All audio is pre-generated (no runtime TTS)

## License

Private project - All rights reserved
