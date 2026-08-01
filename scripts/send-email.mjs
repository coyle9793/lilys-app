#!/usr/bin/env node
// Sends an email via Resend when scripts/fetch-jobs.mjs found new roles.
// No-ops quietly if there's nothing new, or if credentials aren't set.
//
// Required env vars (set as GitHub Actions secrets):
//   RESEND_API_KEY   (https://resend.com/ - free tier)
//   NOTIFY_EMAIL     the address to send alerts to

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEW_JOBS_FILE = path.join(__dirname, "..", "site", "data", "new-jobs.json");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function buildEmailHtml(jobs) {
  const rows = jobs
    .map(
      (job) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;">
          <a href="${escapeHtml(job.url)}" style="font-size:16px;font-weight:600;color:#1a56db;text-decoration:none;">
            ${escapeHtml(job.title)}
          </a>
          <div style="color:#444;font-size:14px;margin-top:2px;">
            ${escapeHtml(job.company)} &middot; ${escapeHtml(job.location)}
            ${job.salary ? ` &middot; ${escapeHtml(job.salary)}` : ""}
          </div>
          <div style="color:#888;font-size:12px;margin-top:2px;text-transform:capitalize;">
            via ${escapeHtml(job.source)}
          </div>
        </td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#111;">${jobs.length} new 2027 grad role${jobs.length === 1 ? "" : "s"} found</h2>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;
}

async function main() {
  let newJobs = [];
  try {
    newJobs = JSON.parse(await readFile(NEW_JOBS_FILE, "utf8"));
  } catch {
    console.log("No new-jobs.json found - nothing to notify.");
    return;
  }

  if (newJobs.length === 0) {
    console.log("No new jobs this run - skipping email.");
    return;
  }

  if (!RESEND_API_KEY || !NOTIFY_EMAIL) {
    console.warn(
      `Found ${newJobs.length} new job(s) but RESEND_API_KEY / NOTIFY_EMAIL are not set - ` +
        "skipping email. See README.md to enable notifications."
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "2027 Grad Jobs <onboarding@resend.dev>",
      to: [NOTIFY_EMAIL],
      subject: `${newJobs.length} new 2027 grad job${newJobs.length === 1 ? "" : "s"} found`,
      html: buildEmailHtml(newJobs),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend API error (${res.status}): ${await res.text()}`);
  }

  console.log(`Emailed ${NOTIFY_EMAIL} about ${newJobs.length} new job(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
