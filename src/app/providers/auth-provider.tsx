import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { getVisitorId } from "../services/visitor-id";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmailOtp: (email: string, fullName?: string) => Promise<{ error?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const claimVisitorScans = async () => {
      const visitorId = getVisitorId();
      if (!visitorId) return;
      try {
        const { error } = await supabase.functions.invoke("claim-visitor", { body: { visitor_id: visitorId } });
        if (!error) {
          window.dispatchEvent(new Event("rankio:visitor-claimed"));
        }
      } catch {
        // ignore claim failures
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      const nextUserId = data.session?.user?.id ?? null;
      const prevUserId = lastUserId.current;
      lastUserId.current = nextUserId;
      if (!prevUserId && nextUserId) {
        await claimVisitorScans();
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      const nextUserId = nextSession?.user?.id ?? null;
      const prevUserId = lastUserId.current;
      lastUserId.current = nextUserId;
      if (!prevUserId && nextUserId) {
        claimVisitorScans();
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signInWithEmailOtp: async (email, fullName) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: fullName ? { full_name: fullName } : undefined,
            emailRedirectTo: window.location.origin,
          },
        });
        return { error: error?.message };
      },
      verifyEmailOtp: async (email, token) => {
        const { error } = await supabase.auth.verifyOtp({
          type: "email",
          email,
          token,
        });
        return { error: error?.message };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
