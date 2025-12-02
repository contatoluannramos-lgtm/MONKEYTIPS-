
// --- imports unchanged ---
import React, { useState, useEffect, Suspense, ReactNode, ErrorInfo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClientDashboard } from './views/ClientDashboard';
import { Match, Tip, SportType } from './types';
import { dbService } from './services/databaseService';
import { authService } from './services/authService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

// --- Lazy Load Admin Area ---
const AdminDashboard = React.lazy(() =>
  import('./views/AdminDashboard')
);

// (DATA MOCK) unchanged...

// (LOGIN COMPONENT) unchanged...

// (LOADINGSCREEN) unchanged...

// (ERRORBOUNDARY) unchanged...

// --- MAIN APP ---
export default function App() {
  const [tips, setTips] = useState<Tip[]>(INITIAL_TIPS);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // -------------------------------
  // AUTH SESSION BOOT
  // -------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn("Supabase not configured. Using mock mode.");
      setLoadingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => subscription.unsubscribe();
  }, []);

  // -------------------------------
  // LIVE DATABASE SYNC
  // -------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    const fetchLatestData = async () => {
      const dbMatches = await dbService.getMatches();
      setMatches(dbMatches.length ? dbMatches : INITIAL_MATCHES);

      const dbTips = await dbService.getTips();
      setTips(dbTips.length ? dbTips : INITIAL_TIPS);
    };

    fetchLatestData();

    const channel = supabase
      .channel('db_changes_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tips' }, fetchLatestData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchLatestData)
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  if (loadingSession) return <LoadingScreen />;

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* CLIENT AREA */}
          <Route path="/" element={<ClientDashboard tips={tips} matches={matches} />} />

          {/* AUTH AREA */}
          <Route
            path="/system/access"
            element={session ? <Navigate to="/system/terminal" /> : <Login />}
          />

          <Route
            path="/system/terminal"
            element={
              session ? (
                <Suspense fallback={<LoadingScreen />}>
                  <AdminDashboard
                    tips={tips}
                    setTips={setTips}
                    matches={matches}
                    setMatches={setMatches}
                  />
                </Suspense>
              ) : (
                <Navigate to="/system/access" />
              )
            }
          />

          {/* HONEYPOT */}
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}