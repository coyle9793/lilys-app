/** Today's date in the browser's local timezone, as "YYYY-MM-DD" — used for daily-streak tracking. */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
