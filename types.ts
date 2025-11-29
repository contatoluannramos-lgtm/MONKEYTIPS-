// types.ts

export enum SportType {
  FOOTBALL = 'Futebol',
  BASKETBALL = 'Basquete',
  VOLLEYBALL = 'Vôlei',
  ICE_HOCKEY = 'Hóquei no Gelo',
  ESPORTS = 'eSports (LoL/CS)'
}

export type AdminView = 
  'DASHBOARD' | 
  'MONKEY_VISION' | 
  'FUSION_CENTER' | 
  'MONKEY_LIVE' | 
  'SCOUT_ENGINE' | 
  'MONKEY_STATS' | 
  'MONKEY_NEWS' | 
  'MONKEY_LABS' | 
  'CALIBRATION' | 
  'ACTIVATION' | 
  'PERFORMANCE';

// --- STATS & DATA INTERFACES ---

export interface FootballStats {
  homeScore: number;
  awayScore: number;
  currentMinute: number;
  possession?: number;
  corners?: { home: number; away: number; total: number };
  shotsOnTarget?: { home: number; away: number };
  shotsOffTarget?: { home: number; away: number };
  attacks?: { dangerous: number; total: number };
  cards?: { yellow: number; red: number };
  xg?: { home: number; away: number };
  // FIX: Added missing recentForm property to align with its usage in liveDataService.
  recentForm?: string;
}

export interface BasketballStats {
  homeScore: number;
  awayScore: number;
  currentPeriod: string;
  timeLeft: string;
  quarters?: { [key: string]: { home: number; away: number } };
  pace?: number;
  efficiency?: number;
}

export interface VolleyballStats {
  homeScore: number; // Sets won
  awayScore: number;
  currentSetScore: { home: number; away: number };
  sets?: { [key: string]: { home: number; away: number } };
}

export interface TeamHistory {
  last5Results: string[]; // ex: ["W", "L", "D", "W", "W"]
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  cleanSheets: number;
  failedToScore: number;
}

export interface Match {
  id: string; // Internal ID e.g., 'live-12345'
  externalId?: number;
  teamAId?: number;
  teamBId?: number;
  sport: SportType;
  teamA: string;
  teamB: string;
  league: string;
  startTime: string;
  status: 'Live' | 'Scheduled' | 'Finished' | 'HT' | 'Postponed';
  referee?: string;
  stats: FootballStats | BasketballStats | VolleyballStats | any;
  history?: {
    home: TeamHistory;
    away: TeamHistory;
  };
}

// --- TIP & ANALYSIS INTERFACES ---

export type TipStatus = 'Pending' | 'Won' | 'Lost';

export interface Tip {
  id: string;
  matchId: string;
  matchTitle: string;
  sport: SportType;
  prediction: string;
  confidence: number;
  odds: number;
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

export interface ScreenAnalysisData {
  sport: string;
  teamA: string;
  teamB: string;
  score: string;
  time: string;
  detectedOdds: { market: string; value: number }[];
  context: string;
}

// --- ENGINE-SPECIFIC INTERFACES ---

export interface ScoutResult {
  matchId: string;
  calculatedProbability: number;
  projectedPoints?: number;
  expectedGoals?: { home: number; away: number };
  signal: 'STRONG_OVER' | 'OVER' | 'NEUTRAL' | 'UNDER' | 'STRONG_UNDER';
  details: string;
  isHotGame: boolean;
  spikeDetected?: boolean;
  spikeDetails?: string;
}

export interface FusionAnalysis {
  matchId: string;
  scoutResult: ScoutResult;
  aiContext: string;
  finalConfidence: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  ev: number;
  marketOdd: number;
  verdict: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_ALERT';
  newsImpactScore?: number;
}

export interface CalibrationConfig {
  football: { instruction: string; weightRecentForm: number; weightHeadToHead: number; poissonStrength: number; over25Threshold: number };
  basketball: { instruction: string; paceWeight: number; efficiencyWeight: number; lineThreshold: number };
  volleyball: { instruction: string; setWinProbability: number; blockWeight: number };
  iceHockey: { instruction: string; powerPlayWeight: number; goalieSaveRateWeight: number };
  onlineGames: { instruction: string; volatilityIndex: number; rtpThreshold: number };
}

// --- NEWS & STATS MODULE INTERFACES ---

export interface BotNewsPayload {
  source: 'globoesporte' | 'nba' | 'espn' | 'other';
  league: 'futebol' | 'basquete';
  urgency: 1 | 2 | 3 | 4 | 5;
  title: string;
  summary: string;
  published_at: string;
  url: string;
}

export interface NewsProcessedItem {
  id: string;
  originalData: BotNewsPayload;
  relevanceScore: number;
  impactLevel: 'BAIXO' | 'MÉDIO' | 'ALTO';
  impactScore: number;
  context: string;
  fusionSummary: string;
  recommendedAction: string;
  status: 'PENDING' | 'ARCHIVED';
  processedAt: string;
}

export interface StatProcessedItem {
  id: string;
  entityName: string;
  category: 'PLAYER_PROP' | 'TEAM_ADVANCED' | 'REFEREE';
  rawData: string;
  marketFocus: string;
  probability: number;
  aiAnalysis: string;
  status: 'PENDING' | 'APPROVED' | 'ARCHIVED';
  processedAt: string;
}

// --- MISC ---

export interface SubscriptionPlan {
  id: 'monthly' | 'quarterly';
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
}

// FIX: Added missing types for admin components
export interface ImprovementProposal {
  title: string;
  desc: string;
}

export interface ChecklistItem {
  label: string;
  status: string;
  color: string;
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  status: string;
  desc: string;
}

export interface RoadmapTask {
  label: string;
  done: boolean;
}
