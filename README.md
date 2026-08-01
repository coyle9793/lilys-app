# 2027 Grad Jobs Finder

Automatically finds UK graduate scheme / graduate programme roles for 2027,
lists them on a small website, and emails you as soon as a new one appears.
Runs entirely on free tiers — no server to pay for or maintain.

## How it works

```
GitHub Actions (every 2 hours)
        │
        ▼
scripts/fetch-jobs.mjs  ──► queries Adzuna + Reed job APIs
        │                    for "graduate scheme/programme 2027" etc.
        ▼
site/data/jobs.json      (everything ever found)
site/data/new-jobs.json  (just what's new this run)
        │
        ▼
scripts/send-email.mjs ──► emails you if new-jobs.json is non-empty
        │
        ▼
git commit + push  ──►  site/ redeploys via GitHub Pages
```

The website (`site/index.html`) reads `site/data/jobs.json` directly, so it
always shows whatever the last workflow run found — searchable and filterable,
with a **NEW** badge on anything found in the last 24 hours.

## One-time setup

### 1. Get free API keys

| Service | Used for | Get a key |
|---|---|---|
| Adzuna | Job search | https://developer.adzuna.com/ (free, gives `app_id` + `app_key`) |
| Reed | Job search | https://www.reed.co.uk/developers (free, gives one API key) |
| Resend | Sending the notification email | https://resend.com/ (free tier, 100 emails/day, no domain setup needed — you can send from their `onboarding@resend.dev` address) |

You only strictly need **one** of Adzuna/Reed for jobs to show up, but both
gives better coverage. You need Resend for email alerts.

### 2. Add them as repository secrets

In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**, add:

- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `REED_API_KEY`
- `RESEND_API_KEY`
- `NOTIFY_EMAIL` — the address you want alerts sent to

### 3. Merge this branch to `main`

GitHub only runs *scheduled* workflows on the repository's default branch, so
the every-2-hours check only starts firing once this is merged. Until then you
can still trigger it manually (see below).

### 4. Turn on GitHub Pages

**Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder: `/site`**.

Your site will be published at `https://<your-username>.github.io/<repo>/`.

### 5. (Optional) Run it once manually

**Actions tab → "Fetch 2027 grad jobs" → Run workflow.** This populates
`site/data/jobs.json` immediately instead of waiting for the next scheduled run.

## Customizing

- **Search terms**: edit the `KEYWORDS` array at the top of
  `scripts/fetch-jobs.mjs` — e.g. add `"software engineering graduate 2027"`
  if you want to narrow by field, or add non-2027 variants if you also want
  rolling/ongoing schemes.
- **Check frequency**: edit the cron schedule in
  `.github/workflows/fetch-jobs.yml` (currently `0 */2 * * *`, every 2 hours).
- **Region**: Adzuna supports other countries by changing `gb` in the API URL
  in `fetch-jobs.mjs` to another country code, if you ever want to broaden
  beyond the UK.

## Limitations

- LinkedIn and Indeed actively block automated scraping and don't offer a
  usable free public API, so they aren't included. Adzuna and Reed both
  aggregate a large share of UK listings (including from LinkedIn/Indeed
  themselves in many cases), but for full coverage it's worth also checking
  Bright Network, Prospects, TargetJobs, and Milkround directly.
- Job data is only as fresh as the last workflow run (every 2 hours by default).
- Free API tiers have rate limits; if you add many more keywords you may need
  to space out requests or upgrade tiers.
