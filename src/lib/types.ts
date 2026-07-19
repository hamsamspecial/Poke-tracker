export type CategoryKey = 'life' | 'study' | 'health' | 'mind' | 'challenge' | 'relation' | 'leisure' | 'economy';

export interface Habit {
  id: string;
  title: string;
  category: CategoryKey;
  cellIndex: number;
  streak: number;
  bestStreak: number;
  lastCheckedDate: string | null;
  pokemon: {
    chain: string[];
    currentStageIndex: number;
    hatched: boolean;
    spriteUrl: string;
  } | null;
}
