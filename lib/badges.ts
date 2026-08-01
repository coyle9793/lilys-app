import type { BadgeStats } from "@/lib/queries";

export type BadgeCategory = "study" | "streaks" | "collection";

export interface Badge {
  id: string;
  label: string;
  description: string;
  category: BadgeCategory;
  isEarned: (stats: BadgeStats) => boolean;
}

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  study: "Study",
  streaks: "Streaks",
  collection: "Collection",
};

export const BADGES: Badge[] = [
  { id: "first-deck", label: "First Deck", description: "Create your first deck", category: "study", isEarned: (s) => s.deckCount >= 1 },
  { id: "first-card", label: "First Card", description: "Study your first flashcard", category: "study", isEarned: (s) => s.reviewedCardCount >= 1 },
  { id: "hundred-cards", label: "100 Cards", description: "Study 100 different flashcards", category: "study", isEarned: (s) => s.reviewedCardCount >= 100 },
  { id: "five-hundred-cards", label: "500 Cards", description: "Study 500 different flashcards", category: "study", isEarned: (s) => s.reviewedCardCount >= 500 },
  { id: "three-day-streak", label: "3-Day Streak", description: "Study 3 days in a row", category: "streaks", isEarned: (s) => s.longestStreak >= 3 },
  { id: "week-streak", label: "Week Streak", description: "Study 7 days in a row", category: "streaks", isEarned: (s) => s.longestStreak >= 7 },
  { id: "month-streak", label: "Month Streak", description: "Study 30 days in a row", category: "streaks", isEarned: (s) => s.longestStreak >= 30 },
  { id: "note-taker", label: "Note Taker", description: "Write your first note", category: "collection", isEarned: (s) => s.noteCount >= 1 },
  { id: "organizer", label: "Organizer", description: "Create your first folder", category: "collection", isEarned: (s) => s.folderCount >= 1 },
  { id: "coin-collector", label: "Coin Collector", description: "Earn 100 coins", category: "collection", isEarned: (s) => s.coins >= 100 },
];
