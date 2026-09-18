import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

//TODO: this is defined in two places try to centralise
export type CommitteeAccessRole = 'committee' | 'librarian';

export interface CommitteeProfile {
  accessRole: CommitteeAccessRole;
  role: string; // specific role label
}

export interface AuthContextValue {
  session: Session | null;
  loading: boolean; 
  profile: CommitteeProfile | null; 
  profileLoading: boolean; 
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
