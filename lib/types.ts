export interface Deck {
  id: string;
  user_id: string;
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
}

export interface NewCardInput {
  hanzi: string;
  pinyin: string;
  definition: string;
  note?: string;
}
