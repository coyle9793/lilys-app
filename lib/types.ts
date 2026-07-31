export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  created_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  hanzi: string;
  pinyin: string;
  definition: string;
  note: string;
  created_at: string;
}

export interface CardProgress {
  id: string;
  card_id: string;
  user_id: string;
  ease: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string | null;
  last_grade: "again" | "hard" | "good" | "easy" | null;
}

export interface Note {
  id: string;
  user_id: string;
  deck_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NewCardInput {
  hanzi: string;
  pinyin: string;
  definition: string;
  note?: string;
}
