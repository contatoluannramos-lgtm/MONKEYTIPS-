export enum SportType {
  FOOTBALL = 'Futebol',
  BASKETBALL = 'Basquete',
  VOLLEYBALL = 'Vôlei',
}

export interface MatchStats {
  possession?: number;
  shotsOnTarget?: number;
  recentForm?: string; // e.g., "W-W-L-D-W"
  injuries?: string[];
  refereeStrictness?: 'Low' | 'Medium' | 'High';
  pace?: number; // Basketball
  efficiency?: number; // Basketball
  errorsPerSet?: number; // Volleyball
  blockRate?: number; // Volleyball
}

export interface Match {
  id: string;
  sport: SportType;
  teamA: string;
  teamB: string;
  league: string;
  startTime: string;
  status: 'Scheduled' | 'Live' | 'Finished';
  stats: MatchStats;
}

export interface Tip {
  id: string;
  matchId: string;
  matchTitle: string;
  sport: SportType;
  prediction: string;
  odds: number;
  confidence: number; // 0-100
  reasoning: string;
  createdAt: string;
  isPremium: boolean;
}

export interface ImprovementProposal {
  id: string;
  title: string;
  description: string;
  votes: number;
  status: 'Pending' | 'Approved' | 'Implemented';
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface User {
  email: string;
  role: 'admin' | 'user';
}

// --- ROADMAP TYPES ---
export interface RoadmapTask {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  tasks: RoadmapTask[];
}