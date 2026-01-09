# FaloClaro Deployment Guide

This guide ensures FaloClaro is deployed as a **completely separate project** from FlipTrip.

## ✅ Separation Checklist

Before deploying, verify:

- [ ] **Supabase**: New project created (NOT the FlipTrip project)
- [ ] **GitHub**: New repository created (NOT fliptripback or fliptripfront)
- [ ] **Vercel**: New project created (NOT fliptrip_frontend or fliptrip_backend)
- [ ] **Environment Variables**: All use FaloClaro-specific values

## Deployment Steps

### 1. Supabase (New Project)

1. Create project at [app.supabase.com](https://app.supabase.com)
2. Name: `faloclaro` or `faloclaro-db`
3. Run `database/schema.sql` in SQL Editor
4. Create Storage bucket `audio` (public)
5. Copy credentials to `.env.local`

### 2. GitHub (New Repository)

**Repository name examples:**
- `faloclaro-app`
- `faloclaro-frontend`
- `faloclaro-portuguese`

**DO NOT use:**
- `fliptripback`
- `fliptripfront`
- Any FlipTrip-related names

```bash
cd "/Users/yes/Downloads/YES PROJECTS/FaloClaro/faloclaro-app"
git init
git add .
git commit -m "Initial commit: FaloClaro Portuguese learning app"
git branch -M main
git remote add origin https://github.com/yourusername/faloclaro-app.git
git push -u origin main
```

### 3. Vercel (New Project)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your **FaloClaro GitHub repository**
4. **Project Name**: `faloclaro` or `faloclaro-app`

**Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-faloclaro-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-faloclaro-anon-key
```

5. Deploy

### 4. Verify Separation

After deployment, verify:

- [ ] FaloClaro Vercel URL is different from FlipTrip URLs
- [ ] FaloClaro uses different Supabase project
- [ ] GitHub repository is separate
- [ ] No shared environment variables

## URLs Structure

**FaloClaro:**
- Vercel: `https://faloclaro.vercel.app` (or your custom domain)
- Supabase: `https://your-faloclaro-project.supabase.co`

**FlipTrip (for reference - DO NOT use):**
- Frontend: `https://fliptripfrontend.vercel.app`
- Backend: `https://fliptripbackend.vercel.app`

## Troubleshooting

### "Project already exists"
- You're trying to use a FlipTrip project name
- Create a new project with a different name

### "Environment variables not found"
- Check Vercel project settings
- Ensure variables are set for Production, Preview, and Development

### "Database connection failed"
- Verify Supabase project is separate from FlipTrip
- Check that credentials match the FaloClaro Supabase project

## Maintenance

- Always use FaloClaro-specific Supabase project
- Never mix environment variables between projects
- Keep GitHub repositories separate
- Use different Vercel projects



