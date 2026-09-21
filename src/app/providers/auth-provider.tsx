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

const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "rankio.lastActiveAt";
const DASHBOARD_REFRESH_EVENT = "rankio:dashboard-refresh";

function readLastActivityAt() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLastActivityAt(value = Date.now()) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(value));
  } catch {
    // ignore storage failures
  }
}

function clearLastActivityAt() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore storage failures
  }
}

function isSessionInactive() {
  const lastActivityAt = readLastActivityAt();
  return lastActivityAt !== null && Date.now() - lastActivityAt > INACTIVITY_LIMIT_MS;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let signOutInProgress = false;
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

      if (nextUserId && readLastActivityAt() === null) {
        writeLastActivityAt();
      }

      setSession(nextSession);
      setUser((currentUser) => (currentUser?.id === nextUserId ? currentUser : nextUser));
      setLoading(false);
      lastUserId.current = nextUserId;

      if (!previousUserId && nextUserId) {
        void claimVisitorScansWithRetry();
      }
    };

    const expireSession = async () => {
      if (signOutInProgress) return;
      signOutInProgress = true;
      clearLastActivityAt();
      syncAuthState(null);
      try {
        await supabase.auth.signOut();
      } finally {
        signOutInProgress = false;
      }
    };

    const validateSession = async (nextSession: Session | null) => {
      if (!nextSession) {
        clearLastActivityAt();
        syncAuthState(null);
        return;
      }

      if (isSessionInactive()) {
        await expireSession();
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        await expireSession();
        return;
      }

      syncAuthState({ ...nextSession, user: data.user });
      window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));
    };

    const handleActivity = () => {
      if (!lastUserId.current) return;
      if (isSessionInactive()) {
        void expireSession();
        return;
      }
      writeLastActivityAt();
    };

    const handleVisibleAgain = () => {
      if (!lastUserId.current) return;
      if (document.visibilityState === "visible") {
        void supabase.auth.getSession().then(({ data }) => validateSession(data.session));
      }
    };

    supabase.auth.getSession().then(({ data }) => validateSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        if (isSessionInactive()) {
          void expireSession();
          return;
        }
        writeLastActivityAt();
      }
      syncAuthState(nextSession);
    });

    const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    window.addEventListener("focus", handleVisibleAgain);
    document.addEventListener("visibilitychange", handleVisibleAgain);

    const inactivityTimer = window.setInterval(() => {
      if (lastUserId.current && isSessionInactive()) {
        void expireSession();
      }
    }, 60 * 1000);

    return () => {
      subscription?.subscription.unsubscribe();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      window.removeEventListener("focus", handleVisibleAgain);
      document.removeEventListener("visibilitychange", handleVisibleAgain);
      window.clearInterval(inactivityTimer);
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
        clearLastActivityAt();
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
