
export enum SportType {
  FOOTBALL = 'Futebol',
  BASKETBALL = 'Basquete',
  VOLLEYBALL = 'Vôlei',
  ICE_HOCKEY = 'Hóquei no Gelo',
  ESPORTS = 'eSports (LoL/CS)',
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
  // Live Data
  homeScore?: number;
  awayScore?: number;
  currentMinute?: number;
}

export interface Match {
  id: string;
  externalId?: number; // ID da API externa (FlashScore/API-Football)
  sport: SportType;
  teamA: string;
  teamB: string;
  league: string;
  startTime: string;
  status: 'Scheduled' | 'Live' | 'Finished';
  stats: MatchStats;
}

export type TipStatus = 'Pending' | 'Won' | 'Lost' | 'Void';

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
  status: TipStatus;
}

export interface TicketAnalysis {
  isValid: boolean;
  extractedTeams: string;
  extractedOdds: number;
  verdict: 'APPROVED' | 'REJECTED' | 'RISKY';
  aiAnalysis: string;
  suggestedAction: string;
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

// --- SCOUT & FUSION ENGINES ---

export interface CalibrationConfig {
  football: {
    weightRecentForm: number; // 0-1
    weightHeadToHead: number; // 0-1
    poissonStrength: number; // 0-1
    over25Threshold: number; // %
  };
  basketball: {
    paceWeight: number;
    efficiencyWeight: number;
    lineThreshold: number;
  };
  volleyball: {
    setWinProbability: number;
    blockWeight: number;
  };
  iceHockey: {
    powerPlayWeight: number;
    goalieSaveRateWeight: number;
  };
  onlineGames: {
    volatilityIndex: number; // Para Cassino/Slots
    rtpThreshold: number;
  };
}

export interface ScoutResult {
  matchId: string;
  calculatedProbability: number; // % Matemática Pura
  expectedGoals?: { home: number, away: number };
  projectedPoints?: number; // Basquete/Volei
  signal: 'STRONG_OVER' | 'STRONG_UNDER' | 'HOME_WIN' | 'AWAY_WIN' | 'NEUTRAL';
  details: string; // Ex: "Poisson indica 2.1 gols"
}

export interface FusionAnalysis {
  matchId: string;
  scoutResult: ScoutResult;
  aiContext: string; // O que o Gemini disse
  finalConfidence: number;
  ev: number; // Expected Value
  marketOdd: number;
  verdict: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_ALERT';
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

// --- ADMIN NAVIGATION ---
export type AdminView = 'DASHBOARD' | 'ACTIVATION' | 'PERFORMANCE' | 'MONKEY_LABS' | 'SCOUT_ENGINE' | 'FUSION_CENTER' | 'CALIBRATION';
