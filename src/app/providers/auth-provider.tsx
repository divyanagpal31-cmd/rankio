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
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const claimVisitorScans = async () => {
      const visitorId = getVisitorId();
      if (!visitorId) return { claimed: 0 };
      try {
        const { data, error } = await supabase.rpc("claim_visitor_websites", { visitor_id: visitorId });
        if (!error) {
          const result = { claimed: Number(data ?? 0) };
          if (result.claimed > 0) {
            window.dispatchEvent(new Event("rankio:visitor-claimed"));
          }
          return result;
        }
      } catch {
        // ignore claim failures
      }

      return { claimed: 0 };
    };

    const claimVisitorScansWithRetry = async () => {
      const delays = [0, 500, 1500, 3000, 6000];
      for (const delay of delays) {
        if (delay > 0) await wait(delay);
        const result = await claimVisitorScans();
        if (result.claimed > 0) {
          return;
        }
      }
    };

    const syncAuthState = (nextSession: Session | null) => {
      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const previousUserId = lastUserId.current;

      setSession(nextSession);
      setUser((currentUser) => (currentUser?.id === nextUserId ? currentUser : nextUser));
      setLoading(false);
      lastUserId.current = nextUserId;

      if (!previousUserId && nextUserId) {
        void claimVisitorScansWithRetry();
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      syncAuthState(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncAuthState(nextSession);
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
        const normalizedEmail = email.trim().toLowerCase();
        const metadata = fullName ? { full_name: fullName } : undefined;
        const { error: ensureUserError } = await supabase.functions.invoke("ensure-auth-user", {
          body: {
            email: normalizedEmail,
            data: metadata,
          },
        });

        if (ensureUserError) {
          return { error: ensureUserError.message };
        }

        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: false,
            data: metadata,
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
