# 汉字 Flashcards

Turn Chinese class slides (PowerPoint, PDF, or photos) into flashcards, then study
them with flip cards, multiple choice, typing quizzes, and spaced repetition —
free, with your decks synced to your account.

## Setup

1. **Create a free Supabase project** at [supabase.com](https://supabase.com).
2. In your project's SQL Editor, run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
   to create the `decks`, `cards`, and `card_progress` tables (with row-level
   security so each account only sees its own data).
3. In your Supabase project settings (Project Settings → API), copy the
   **Project URL** and **anon public key**.
4. Copy `.env.example` to `.env.local` and fill in those two values:
   ```bash
   cp .env.example .env.local
   ```
5. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000), sign up, and import your
   first deck.

By default Supabase requires email confirmation for new accounts — you can turn
this off for personal use in Authentication → Providers → Email → "Confirm
email" in your Supabase dashboard, or check your inbox for the confirmation link.

### Optional: accurate character guessing with a free Gemini API key

Material with no Hanzi at all (pinyin+English Q&A sheets, photos where OCR only
picks up the romanization) gets an experimental **"Guess 汉字"** button per card
on the review screen. Without any extra setup this falls back to a plain
dictionary lookup, which is frequently wrong — Chinese has many characters that
sound identical, and there's no way to pick the right one from pinyin alone
without understanding the sentence.

To make these guesses actually reliable, get a free Gemini API key (no credit
card required):

1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2. Create an API key (usually under "Get API key").
3. Add it to `.env.local`:
   ```
   GEMINI_API_KEY=your-key-here
   ```
4. Restart `npm run dev`.

With a key configured, guesses are sent to Gemini's free tier along with the
card's English translation as context, so it can pick the correct character
among homophones (e.g. 是 "is" vs. 十 "ten" vs. 室 "room", all read "shi").
**Don't add a billing method to the Google Cloud project** — enabling billing
removes the free tier entirely, even for calls that would've fit inside it.
The free tier has modest rate limits (per-model requests per minute/day), which
is plenty for reviewing one deck at a time.

## How it works

- **Import**: upload a `.pptx`, `.pdf`, or image. Text is extracted right in your
  browser (`jszip` for PowerPoint XML, `pdfjs-dist` for PDF text layers); photos
  and scanned/image-only PDF pages are read with on-device OCR (`tesseract.js`).
- **Flashcard generation**: extracted text is segmented into Chinese words using a
  forward-maximum-matching algorithm against [CC-CEDICT](https://cc-cedict.org/),
  then each word is looked up for pinyin and English definitions. You review and
  edit the results before saving.
- **Study**: flip cards, multiple-choice quizzes, and pinyin-typing quizzes, all
  backed by a lightweight SM-2-style spaced repetition scheduler that tracks
  per-card due dates in Supabase.

### Dictionary attribution

Definitions and pinyin come from [CC-CEDICT](https://cc-cedict.org/), used under
the [Creative Commons Attribution-ShareAlike 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/),
via the [`cedict-json`](https://www.npmjs.com/package/cedict-json) npm package.

## Tech stack

Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + Auth), all on
free tiers. No paid APIs are used anywhere in the pipeline.
