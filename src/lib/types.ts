export interface Player {
  id: string;
  name: string;
}

export interface Round {
  id: number;
  scores: Record<string, number>; 
  isHand: boolean;
  winnerId: string;
}

export interface Group {
  id: string;
  name: string;
  players: Player[];
  rounds: Round[];
  createdAt: number;
}

export interface AppSettings {
  winnerScore: number;
  theme: Theme;
  currentGroupId: string;
}

export type Theme = 'vibrant' | 'ocean' | 'sunset' | 'forest';