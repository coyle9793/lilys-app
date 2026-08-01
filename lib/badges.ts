import type { BadgeStats } from "@/lib/queries";

export interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  isEarned: (stats: BadgeStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first-deck", icon: "🗂️", label: "First Deck", description: "Create your first deck", isEarned: (s) => s.deckCount >= 1 },
  { id: "first-card", icon: "🀄", label: "First Card", description: "Study your first flashcard", isEarned: (s) => s.reviewedCardCount >= 1 },
  { id: "hundred-cards", icon: "💯", label: "100 Cards", description: "Study 100 different flashcards", isEarned: (s) => s.reviewedCardCount >= 100 },
  { id: "five-hundred-cards", icon: "🏆", label: "500 Cards", description: "Study 500 different flashcards", isEarned: (s) => s.reviewedCardCount >= 500 },
  { id: "three-day-streak", icon: "🔥", label: "3-Day Streak", description: "Study 3 days in a row", isEarned: (s) => s.longestStreak >= 3 },
  { id: "week-streak", icon: "⚡", label: "Week Streak", description: "Study 7 days in a row", isEarned: (s) => s.longestStreak >= 7 },
  { id: "month-streak", icon: "🌟", label: "Month Streak", description: "Study 30 days in a row", isEarned: (s) => s.longestStreak >= 30 },
  { id: "note-taker", icon: "📝", label: "Note Taker", description: "Write your first note", isEarned: (s) => s.noteCount >= 1 },
  { id: "organizer", icon: "🗃️", label: "Organizer", description: "Create your first folder", isEarned: (s) => s.folderCount >= 1 },
  { id: "coin-collector", icon: "🪙", label: "Coin Collector", description: "Earn 100 coins", isEarned: (s) => s.coins >= 100 },
];
