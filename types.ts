
export enum SportType {
  FOOTBALL = 'Futebol',
  BASKETBALL = 'Basquete',
  VOLLEYBALL = 'Vôlei',
  ICE_HOCKEY = 'Hóquei no Gelo',
  ESPORTS = 'eSports (LoL/CS)'
}

export type AdminView = 'DASHBOARD' | 'ACTIVATION' | 'MONKEY_LABS' | 'MONKEY_VISION' | 'MONKEY_NEWS' | 'PERFORMANCE' | 'CALIBRATION' | 'SCOUT_ENGINE' | 'FUSION_CENTER';

export interface FootballStats {
  homeScore: number;
  awayScore: number;
  currentMinute: number;
  possession: number;
  corners: { home: number; away: number; total: number };
  shotsOnTarget: { home: number; away: number };
  shotsOffTarget: { home: number; away: number };
  attacks: { dangerous: number; total: number };
  cards: { yellow: number; red: number };
  recentForm: string;
  xg?: { home: number; away: number };
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
  awayScore: number;
  currentSetScore: { home: number; away: number };
  sets: {
    s1: { home: number; away: number };
    s2: { home: number; away: number };
    s3: { home: number; away: number };
    s4: { home: number; away: number };
    s5: { home: number; away: number };
  };
  aces?: { home: number; away: number };
  errors?: { home: number; away: number };
}

// Nova estrutura para histórico dos últimos 5 jogos
export interface TeamHistory {
  last5Results: string[]; // ex: ["W", "L", "D", "W", "W"]
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  cleanSheets: number;
  failedToScore: number;
}

export interface Match {
  id: string;
  externalId?: number; // ID da API (ex: 71823)
  teamAId?: number;    // ID do time Casa
  teamBId?: number;    // ID do time Fora
  sport: SportType;
  teamA: string;
  teamB: string;
  league: string;
  startTime: string;
  status: 'Live' | 'Scheduled' | 'Finished' | 'HT' | 'Postponed';
  referee?: string; // Nome do Árbitro
  stats: FootballStats | BasketballStats | VolleyballStats | any;
  history?: {
    home: TeamHistory;
    away: TeamHistory;
  };
}

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

export interface NewsAnalysis {
  headline: string;
  impactScore: number; // -100 to +100
  affectedSector: 'MORALE' | 'TACTICAL' | 'MARKET_ODDS';
  summary: string;
  sourceUrl?: string;
  relatedTeam?: string;
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

export interface RoadmapTask {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  progress: number;
  tasks: RoadmapTask[];
}

export interface ScoutResult {
  matchId: string;
  calculatedProbability: number;
  projectedPoints?: number; // Para basquete/vôlei
  expectedGoals?: { home: number; away: number }; // Para futebol
  signal: 'STRONG_OVER' | 'OVER' | 'NEUTRAL' | 'UNDER' | 'STRONG_UNDER';
  details: string;
}

export interface FusionAnalysis {
  matchId: string;
  scoutResult: ScoutResult;
  aiContext: string;
  finalConfidence: number;
  ev: number; // Expected Value
  marketOdd: number;
  verdict: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_ALERT';
}

export interface CalibrationConfig {
  football: { instruction: string; weightRecentForm: number; weightHeadToHead: number; poissonStrength: number; over25Threshold: number };
  basketball: { instruction: string; paceWeight: number; efficiencyWeight: number; lineThreshold: number };
  volleyball: { instruction: string; setWinProbability: number; blockWeight: number };
  iceHockey: { instruction: string; powerPlayWeight: number; goalieSaveRateWeight: number };
  onlineGames: { instruction: string; volatilityIndex: number; rtpThreshold: number };
}

export const TARGET_TEAMS_BRASILEIRAO = [
  "Botafogo", "Palmeiras", "Fortaleza", "Flamengo", "Internacional", 
  "São Paulo", "Bahia", "Cruzeiro", "Vasco", "Atlético-MG"
];
