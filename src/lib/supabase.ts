import { createClient, SupabaseClient, Session, User } from "@supabase/supabase-js";
import { googleAuth, setToken, setStoredRole } from "./api";
import { registerCustomer } from "./simulation/engine";

const rawSupabaseUrl = (
  typeof import.meta !== "undefined"
    ? (import.meta.env?.["VITE_SUPABASE_URL"] as string | undefined)
    : undefined
)?.trim();

const rawSupabaseAnonKey = (
  typeof import.meta !== "undefined"
    ? (import.meta.env?.["VITE_SUPABASE_ANON_KEY"] as string | undefined)
    : undefined
)?.trim();

// Check if valid credentials are provided
export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
  rawSupabaseUrl.startsWith("https://") &&
  rawSupabaseUrl.includes(".supabase.co") &&
  rawSupabaseAnonKey &&
  rawSupabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawSupabaseUrl!, rawSupabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseDetails() {
  return {
    isConfigured: isSupabaseConfigured,
    url: rawSupabaseUrl || "",
    hasKey: Boolean(rawSupabaseAnonKey),
  };
}

/**
 * Initiates Supabase Google OAuth redirect flow.
 * Supabase handles the OAuth consent screen with Google and redirects back to the app.
 */
export async function signInWithSupabaseGoogle(redirectTo?: string) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
    );
  }

  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://ecocycle-seven-tan.vercel.app";
  const targetRedirect = redirectTo || `${origin}/login`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: targetRedirect,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Supabase Google Auth error:", error);
    throw error;
  }

  return data;
}

/**
 * Sign in using Google ID Token via Supabase (e.g. from Google One-Tap or Google Identity Services credential).
 */
export async function signInWithSupabaseGoogleIdToken(idToken: string) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
    );
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) {
    console.error("Supabase signInWithIdToken error:", error);
    throw error;
  }

  if (data.session) {
    await syncSupabaseSessionWithBackend(data.session);
  }

  return data;
}

/**
 * Syncs an authenticated Supabase session with the EcoCycle backend.
 * Ensures the Customer profile and local JWT access token exist for the active database session.
 */
export async function syncSupabaseSessionWithBackend(session: Session) {
  const user = session.user;
  const email = user.email;
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email?.split("@")[0] ||
    "EcoCycle Member";
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;

  try {
    const backendRes = await googleAuth({
      email,
      name: fullName,
      picture: avatarUrl,
    });

    setToken(backendRes.access_token);
    setStoredRole(backendRes.role || "CUSTOMER");
    registerCustomer(fullName, email || fullName);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ecocycle-auth-change"));
    }

    return backendRes;
  } catch (err) {
    console.warn("Could not sync Supabase user with local backend:", err);
    return null;
  }
}

/**
 * Signs out from Supabase Auth and cleans up sessions.
 */
export async function signOutSupabase() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout warning:", e);
    }
  }
}

/**
 * Retrieves the current Supabase session if available.
 */
export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Initializes a listener for Supabase auth state changes and URL OAuth hashes.
 */
export function listenToSupabaseAuth(onSession?: (user: User | null) => void) {
  if (!supabase) return () => {};

  // Check initial session
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      syncSupabaseSessionWithBackend(data.session);
      onSession?.(data.session.user);
    }
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
      await syncSupabaseSessionWithBackend(session);
      onSession?.(session.user);
    } else if (event === "SIGNED_OUT") {
      onSession?.(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}
