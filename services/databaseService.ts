
import { supabase } from './supabaseClient';
import { Match, Tip, SportType } from '../types';

// Mappers para converter snake_case (banco) para camelCase (app)
const mapMatchFromDB = (data: any): Match => ({
  id: data.id,
  sport: data.sport as SportType,
  teamA: data.team_a,
  teamB: data.team_b,
  league: data.league,
  startTime: data.start_time,
  status: data.status,
  stats: data.stats || {}
});

const mapTipFromDB = (data: any): Tip => ({
  id: data.id,
  matchId: data.match_id,
  matchTitle: data.match_title,
  sport: data.sport as SportType,
  prediction: data.prediction,
  confidence: data.confidence,
  odds: data.odds,
  reasoning: data.reasoning,
  createdAt: data.created_at,
  isPremium: data.is_premium
});

export const dbService = {
  // --- PARTIDAS ---
  async getMatches(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Erro ao buscar partidas:', error);
      return [];
    }
    return data.map(mapMatchFromDB);
  },

  async saveMatch(match: Match): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .upsert({
        id: match.id,
        sport: match.sport,
        team_a: match.teamA,
        team_b: match.teamB,
        league: match.league,
        start_time: match.startTime,
        status: match.status,
        stats: match.stats
      });

    if (error) console.error('Erro ao salvar partida:', error);
  },

  // --- TIPS ---
  async getTips(): Promise<Tip[]> {
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tips:', error);
      return [];
    }
    return data.map(mapTipFromDB);
  },

  async saveTip(tip: Tip): Promise<void> {
    const { error } = await supabase
      .from('tips')
      .insert({
        id: tip.id,
        match_id: tip.matchId,
        match_title: tip.matchTitle,
        sport: tip.sport,
        prediction: tip.prediction,
        confidence: tip.confidence,
        odds: tip.odds,
        reasoning: tip.reasoning,
        created_at: tip.createdAt,
        is_premium: tip.isPremium
      });

    if (error) console.error('Erro ao salvar tip:', error);
  }
};
