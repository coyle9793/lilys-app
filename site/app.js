const jobListEl = document.getElementById("jobList");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const metaEl = document.getElementById("meta");
const searchEl = document.getElementById("search");
const sourceFilterEl = document.getElementById("sourceFilter");
const sortOrderEl = document.getElementById("sortOrder");

let allJobs = [];

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 36e5);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isRecent(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const sourceFilter = sourceFilterEl.value;
  const sortOrder = sortOrderEl.value;

  let jobs = allJobs.filter((job) => {
    if (sourceFilter && job.source !== sourceFilter) return false;
    if (!query) return true;
    const haystack = `${job.title} ${job.company} ${job.location}`.toLowerCase();
    return haystack.includes(query);
  });

  jobs = jobs.slice().sort((a, b) => {
    const diff = new Date(b.firstSeen) - new Date(a.firstSeen);
    return sortOrder === "newest" ? diff : -diff;
  });

  countEl.textContent = `${jobs.length} job${jobs.length === 1 ? "" : "s"}`;
  jobListEl.innerHTML = "";
  emptyEl.hidden = jobs.length > 0;

  for (const job of jobs) {
    const li = document.createElement("li");
    if (isRecent(job.firstSeen)) li.classList.add("is-new");

    const a = document.createElement("a");
    a.href = job.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "job-title";
    a.textContent = job.title;
    li.appendChild(a);

    if (isRecent(job.firstSeen)) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "NEW";
      li.appendChild(badge);
    }

    const sub = document.createElement("div");
    sub.className = "job-sub";
    const parts = [job.company, job.location];
    if (job.salary) parts.push(job.salary);
    parts.push(`via ${job.source}`);
    parts.push(`found ${timeAgo(job.firstSeen)}`);
    sub.textContent = parts.filter(Boolean).join(" · ");
    li.appendChild(sub);

    jobListEl.appendChild(li);
  }
}

async function init() {
  try {
    const [jobs, meta] = await Promise.all([
      fetch("data/jobs.json").then((r) => r.json()),
      fetch("data/meta.json").then((r) => r.json()),
    ]);
    allJobs = jobs;
    metaEl.textContent = meta.lastChecked
      ? `Last checked ${new Date(meta.lastChecked).toLocaleString()} · tracking ${meta.totalJobs} job(s)`
      : "Not checked yet - the fetch workflow hasn't run.";
    render();
  } catch (err) {
    metaEl.textContent = "Could not load job data.";
    console.error(err);
  }
}

searchEl.addEventListener("input", render);
sourceFilterEl.addEventListener("change", render);
sortOrderEl.addEventListener("change", render);

init();
