
export enum SportType {
  FOOTBALL = 'Futebol',
  BASKETBALL = 'Basquete',
  VOLLEYBALL = 'Vôlei',
  ICE_HOCKEY = 'Hóquei no Gelo',
  ESPORTS = 'eSports (LoL/CS)',
}

// --- DEEP STATS INTERFACES ---

export interface FootballStats {
  homeScore: number;
  awayScore: number;
  currentMinute: number;
  possession: number;
  corners: { home: number; away: number; total: number };
  shotsOnTarget: { home: number; away: number };
  shotsOffTarget: { home: number; away: number };
  xg?: { home: number; away: number }; // Expected Goals
  attacks: { dangerous: number; total: number };
  cards: { yellow: number; red: number };
  recentForm?: string;
}

export interface BasketballStats {
  homeScore: number;
  awayScore: number;
  currentPeriod: string; // Q1, Q2, Q3, Q4, OT
  timeLeft: string;
  quarters: {
    q1: { home: number; away: number };
    q2: { home: number; away: number };
    q3: { home: number; away: number };
    q4: { home: number; away: number };
  };
  pace?: number;
  efficiency?: number;
  turnovers: { home: number; away: number };
  rebounds: { home: number; away: number };
  threePointPercentage: { home: number; away: number };
}

export interface VolleyballStats {
  homeScore: number; // Sets won
  awayScore: number; // Sets won
  currentSetScore: { home: number; away: number };
  sets: Array<{ home: number; away: number }>; // Histórico de sets
  aces: { home: number; away: number };
  errors: { home: number; away: number };
  blocks: { home: number; away: number };
}

export interface GenericStats {
  homeScore: number;
  awayScore: number;
  currentTime: string;
  details: string;
}

// Union Type para flexibilidade
export type MatchStats = FootballStats | BasketballStats | VolleyballStats | GenericStats;

export interface MatchOdds {
  home: number;
  draw?: number;
  away: number;
  lastUpdate: string;
}

export interface Match {
  id: string;
  externalId?: number; 
  sport: SportType;
  teamA: string;
  teamB: string;
  league: string;
  startTime: string;
  status: 'Scheduled' | 'Live' | 'Finished' | 'Halftime' | 'Paused';
  stats: MatchStats;
  odds?: MatchOdds;
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
    instruction: string;
    weightRecentForm: number;
    weightHeadToHead: number;
    poissonStrength: number;
    over25Threshold: number;
  };
  basketball: {
    instruction: string;
    paceWeight: number;
    efficiencyWeight: number;
    lineThreshold: number;
  };
  volleyball: {
    instruction: string;
    setWinProbability: number;
    blockWeight: number;
  };
  iceHockey: {
    instruction: string;
    powerPlayWeight: number;
    goalieSaveRateWeight: number;
  };
  onlineGames: {
    instruction: string;
    volatilityIndex: number;
    rtpThreshold: number;
  };
}

export interface ScoutResult {
  matchId: string;
  calculatedProbability: number; 
  expectedGoals?: { home: number, away: number };
  projectedPoints?: number; 
  signal: 'STRONG_OVER' | 'STRONG_UNDER' | 'HOME_WIN' | 'AWAY_WIN' | 'NEUTRAL';
  details: string; 
}

export interface FusionAnalysis {
  matchId: string;
  scoutResult: ScoutResult;
  aiContext: string; 
  finalConfidence: number;
  ev: number; 
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
