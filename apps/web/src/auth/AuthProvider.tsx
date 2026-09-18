import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/SupabaseClient';
import { AuthContext, type CommitteeProfile } from './AuthContext';
import { type Session } from '@supabase/supabase-js';
import { trpc } from '../lib/TRPC';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [fetchedProfile, setFetchedProfile] = useState<{
    userId: string;
    profile: CommitteeProfile;
  } | null>(null);

  useEffect(() => {
    // restore whatever session is in local storage
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // keep state in sync with auth refresh events including ones in other tabs.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // when the signed-in user changes, re-fetch the user's committee profile from api
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    // call the api to get user role and access details
    trpc.me 
      .query()
      .then((result) => {
        if (cancelled) return;
        setFetchedProfile({ userId, profile: { accessRole: result.accessRole, role: result.role! }});
      })
      .catch((err) => {
        if (cancelled) return; 
        console.error('[AuthProvider] failed to load committee profile:', err);
        // sign out if failed to get committee profile
        void supabase.auth.signOut();
      })

      return () => {
        cancelled = true;
      }
  }, [userId]);

  const profileLoading = Boolean(userId) && !(fetchedProfile && fetchedProfile.userId === userId);

  const profile =
    fetchedProfile && fetchedProfile.userId === userId ? fetchedProfile.profile : null;

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, profile, profileLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
