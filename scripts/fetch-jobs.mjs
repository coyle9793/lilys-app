#!/usr/bin/env node
// Fetches UK 2027 graduate scheme/programme listings from the Adzuna and Reed
// job APIs, merges them with what we already know about, and writes:
//   site/data/jobs.json      - every job ever seen (append-only)
//   site/data/new-jobs.json  - just the jobs found in *this* run
//   site/data/meta.json      - last-checked timestamp + counts
//
// Required env vars (set as GitHub Actions secrets):
//   ADZUNA_APP_ID, ADZUNA_APP_KEY   (https://developer.adzuna.com/)
//   REED_API_KEY                    (https://www.reed.co.uk/developers)
// Either source can be omitted; the script skips it and carries on.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "site", "data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const NEW_JOBS_FILE = path.join(DATA_DIR, "new-jobs.json");
const META_FILE = path.join(DATA_DIR, "meta.json");

const KEYWORDS = [
  "graduate scheme 2027",
  "graduate programme 2027",
  "graduate program 2027",
  "graduate job 2027",
  "2027 graduate scheme",
  "2027 graduate programme",
];

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const REED_API_KEY = process.env.REED_API_KEY;

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}: ${await res.text()}`);
  }
  return res.json();
}

async function searchAdzuna(keyword) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: "50",
    what: keyword,
    sort_by: "date",
    "content-type": "application/json",
  });
  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?${params.toString()}`;
  try {
    const data = await fetchJson(url);
    return (data.results || []).map((job) => ({
      url: job.redirect_url,
      title: job.title?.trim(),
      company: job.company?.display_name?.trim() || "Unknown",
      location: job.location?.display_name?.trim() || "UK",
      salary:
        job.salary_min && job.salary_max
          ? `£${Math.round(job.salary_min).toLocaleString()} - £${Math.round(job.salary_max).toLocaleString()}`
          : null,
      description: job.description?.slice(0, 300) || "",
      postedDate: job.created || null,
      source: "adzuna",
    }));
  } catch (err) {
    console.error(`Adzuna search failed for "${keyword}":`, err.message);
    return [];
  }
}

async function searchReed(keyword) {
  if (!REED_API_KEY) return [];
  const params = new URLSearchParams({
    keywords: keyword,
    resultsToTake: "100",
  });
  const url = `https://www.reed.co.uk/api/1.0/search?${params.toString()}`;
  const auth = Buffer.from(`${REED_API_KEY}:`).toString("base64");
  try {
    const data = await fetchJson(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return (data.results || []).map((job) => ({
      url: job.jobUrl,
      title: job.jobTitle?.trim(),
      company: job.employerName?.trim() || "Unknown",
      location: job.locationName?.trim() || "UK",
      salary:
        job.minimumSalary && job.maximumSalary
          ? `£${Math.round(job.minimumSalary).toLocaleString()} - £${Math.round(job.maximumSalary).toLocaleString()}`
          : null,
      description: job.jobDescription?.slice(0, 300) || "",
      postedDate: job.date || null,
      source: "reed",
    }));
  } catch (err) {
    console.error(`Reed search failed for "${keyword}":`, err.message);
    return [];
  }
}

function hasGrad2027Signal(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  return text.includes("2027") && /graduate|grad scheme|grad programme|grad program/.test(text);
}

async function loadExisting() {
  try {
    const raw = await readFile(JOBS_FILE, "utf8");
    const jobs = JSON.parse(raw);
    return new Map(jobs.map((job) => [job.url, job]));
  } catch {
    return new Map();
  }
}

async function main() {
  if (!ADZUNA_APP_ID && !REED_API_KEY) {
    console.warn(
      "No API credentials set (ADZUNA_APP_ID/ADZUNA_APP_KEY or REED_API_KEY). " +
        "Nothing to fetch - see README.md for how to get free keys."
    );
  }

  await mkdir(DATA_DIR, { recursive: true });

  const fresh = new Map();
  for (const keyword of KEYWORDS) {
    const [adzuna, reed] = await Promise.all([searchAdzuna(keyword), searchReed(keyword)]);
    for (const job of [...adzuna, ...reed]) {
      if (!job.url || !job.title) continue;
      if (!hasGrad2027Signal(job)) continue;
      fresh.set(job.url, job);
    }
  }

  const existing = await loadExisting();
  const now = new Date().toISOString();
  const newJobs = [];
  const merged = new Map(existing);

  for (const [url, job] of fresh) {
    if (existing.has(url)) {
      merged.set(url, { ...existing.get(url), ...job, firstSeen: existing.get(url).firstSeen });
    } else {
      const withTimestamp = { ...job, firstSeen: now };
      merged.set(url, withTimestamp);
      newJobs.push(withTimestamp);
    }
  }

  const mergedJobs = [...merged.values()].sort(
    (a, b) => new Date(b.firstSeen) - new Date(a.firstSeen)
  );

  await writeFile(JOBS_FILE, JSON.stringify(mergedJobs, null, 2));
  await writeFile(NEW_JOBS_FILE, JSON.stringify(newJobs, null, 2));
  await writeFile(
    META_FILE,
    JSON.stringify({ lastChecked: now, totalJobs: mergedJobs.length, newThisRun: newJobs.length }, null, 2)
  );

  console.log(`Checked ${KEYWORDS.length} keyword variants.`);
  console.log(`Total jobs tracked: ${mergedJobs.length}. New this run: ${newJobs.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
