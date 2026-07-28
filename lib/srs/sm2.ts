export interface ProgressState {
  ease: number;
  intervalDays: number;
}

export type Grade = "again" | "hard" | "good" | "easy";

const GRADE_QUALITY: Record<Grade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

/**
 * SM-2-style spaced repetition scheduler. Returns the next ease/interval and
 * due date given how the user rated their recall of a card.
 */
export function schedule(
  state: ProgressState,
  grade: Grade,
  now: Date = new Date(),
): { ease: number; intervalDays: number; dueAt: Date } {
  const quality = GRADE_QUALITY[grade];
  let { ease, intervalDays } = state;

  ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    intervalDays = 1 / 24 / 6; // ~10 minutes: relearn almost immediately.
  } else if (intervalDays <= 0) {
    intervalDays = 1;
  } else if (intervalDays < 6) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(intervalDays * ease);
  }

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { ease, intervalDays, dueAt };
}
