
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Match, Tip, SportType, TipStatus, NewsProcessedItem, StatProcessedItem } from '../types';

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
  isPremium: data.is_premium,
  status: data.status || 'Pending'
});

const mapNewsFromDB = (data: any): NewsProcessedItem => ({
  id: data.id,
  originalData: data.original_data,
  relevanceScore: data.relevance_score,
  impactLevel: data.impact_level,
  impactScore: data.impact_score,
  context: data.context,
  fusionSummary: data.fusion_summary,
  recommendedAction: data.recommended_action,
  status: data.status,
  processedAt: data.processed_at
});

const mapStatFromDB = (data: any): StatProcessedItem => ({
  id: data.id,
  entityName: data.entity_name,
  category: data.category,
  rawData: data.raw_data,
  marketFocus: data.market_focus,
  probability: data.probability,
  aiAnalysis: data.ai_analysis,
  status: data.status,
  processedAt: data.processed_at
});

export const dbService = {
  // --- PARTIDAS ---
  async getMatches(): Promise<Match[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Erro ao buscar partidas:', error.message || error);
      return [];
    }
    return data ? data.map(mapMatchFromDB) : [];
  },

  async saveMatch(match: Match): Promise<void> {
    if (!isSupabaseConfigured()) return;

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

    if (error) console.error('Erro ao salvar partida:', error.message || error);
  },

  // --- TIPS ---
  async getTips(): Promise<Tip[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tips:', error.message || error);
      return [];
    }
    return data ? data.map(mapTipFromDB) : [];
  },

  async saveTip(tip: Tip): Promise<void> {
    if (!isSupabaseConfigured()) return;

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
        is_premium: tip.isPremium,
        status: tip.status
      });

    if (error) console.error('Erro ao salvar tip:', error.message || error);
  },

  async updateTipStatus(tipId: string, status: TipStatus): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('tips')
      .update({ status: status })
      .eq('id', tipId);

    if (error) {
      console.error('Erro ao atualizar status da tip:', error.message || error);
    }
  },

  // --- NEWS ENGINE ---
  async getNews(): Promise<NewsProcessedItem[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(50); // Limite para não pesar o frontend

    if (error) {
      console.error('Erro ao buscar notícias:', error.message || error);
      return [];
    }
    return data ? data.map(mapNewsFromDB) : [];
  },

  async saveNews(item: NewsProcessedItem): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('news')
      .upsert({
        id: item.id,
        original_data: item.originalData,
        relevance_score: item.relevanceScore,
        impact_level: item.impactLevel,
        impact_score: item.impactScore,
        context: item.context,
        fusion_summary: item.fusionSummary,
        recommended_action: item.recommendedAction,
        status: item.status,
        processed_at: item.processedAt
      });

    if (error) console.error('Erro ao salvar notícia:', error.message || error);
  },

  async archiveNews(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('news')
      .update({ status: 'ARCHIVED' })
      .eq('id', id);

    if (error) console.error('Erro ao arquivar notícia:', error.message || error);
  },

  // --- MONKEY STATS ---
  async getStats(): Promise<StatProcessedItem[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('monkey_stats')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar stats:', error.message || error);
      return [];
    }
    return data ? data.map(mapStatFromDB) : [];
  },

  async saveStat(item: StatProcessedItem): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('monkey_stats')
      .upsert({
        id: item.id,
        entity_name: item.entityName,
        category: item.category,
        raw_data: item.rawData,
        market_focus: item.marketFocus,
        probability: item.probability,
        ai_analysis: item.aiAnalysis,
        status: item.status,
        processed_at: item.processedAt
      });

    if (error) console.error('Erro ao salvar stat:', error.message || error);
  }
};
