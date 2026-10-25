# StyleScout

A personal clothing finder. Upload clothes you love, tell it (by typing or speaking) what you've learned about your style, and it keeps a row of picks for each category: tops, shirts, outerwear, pants, shorts, shoes and accessories. Heart or dislike picks, or give detailed feedback, and it learns. Ask for one-off things ("loafers under $250") from the bar at the top.

Products come from the open web via Claude's web search, restricted to stores selling new items. Resale and marketplace sites (eBay, Poshmark, Depop, Grailed, etc.) are always blocked, and you can block more stores in Profile.

## Stack

- Next.js 16 (App Router) + Tailwind 4, mobile-first with a desktop layout
- Claude (`claude-opus-5-5`) for product search (web search + web fetch), closet photo tagging and preference learning
- Supabase for the database and closet photo storage
- Browser speech recognition for voice input (Chrome, Safari, Edge)

## Setup

1. **Supabase:** create a project, open the SQL editor, and run `supabase/schema.sql`. It creates the tables and a private `closet` storage bucket.
2. **Vercel:** import this repo and add the environment variables from `.env.example`:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API)
   - `APP_PASSCODE` (what you type to get in) and `SESSION_SECRET` (any long random string)
3. Deploy, open the site, enter your passcode, and go through onboarding.

Searches run in the background for up to 5 minutes per request (`maxDuration = 300`), which Vercel's Hobby plan supports with Fluid compute (on by default).

## Local development

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

If `APP_PASSCODE` is unset, the app is open without a login.

## How it learns

- **What you tell it** (onboarding, Profile → "Tell me about your style", notes on closet items, comments on picks) is turned into plain-language preferences right away. You can see, edit and delete them in Profile.
- **Quick reactions** (hearts, dislikes, dislike reasons, "I bought this") are fed directly into every search, and every 8 reactions they're reviewed for patterns worth writing down as preferences.
- Each feed refills itself when it runs low on unrated picks (at most every 15 minutes per category), or when you tap **More**.

## Cost

Each feed refresh or one-off search is a Claude call with several web searches and page fetches, typically well under a dollar. Feedback and notes are small, cheap calls.
