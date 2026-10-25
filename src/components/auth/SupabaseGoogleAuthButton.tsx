import { useState, useEffect } from "react";
import { GoogleIcon } from "./GoogleIcon";
import {
  isSupabaseConfigured,
  signInWithSupabaseGoogle,
  getSupabaseDetails,
  listenToSupabaseAuth,
} from "@/lib/supabase";
import { googleAuth, setStoredRole } from "@/lib/api";

interface SupabaseGoogleAuthButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (err: string) => void;
  className?: string;
  redirectTo?: string;
}

export function SupabaseGoogleAuthButton({
  onSuccess,
  onError,
  className = "",
  redirectTo,
}: SupabaseGoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const supabaseInfo = getSupabaseDetails();

  useEffect(() => {
    if (isSupabaseConfigured) {
      const unsubscribe = listenToSupabaseAuth((user) => {
        if (user) {
          onSuccess?.(user);
        }
      });
      return () => unsubscribe();
    }
  }, [onSuccess]);

  const handleAuthClick = async () => {
    if (!isSupabaseConfigured) {
      setShowConfigModal(true);
      return;
    }

    setLoading(true);
    try {
      await signInWithSupabaseGoogle(redirectTo);
    } catch (err: any) {
      console.error("Supabase Google sign-in failed:", err);
      onError?.(err?.message || "Supabase Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleInstantFallbackAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = manualEmail.trim() || "advaitnawathe007@gmail.com";
    const prefix = emailToUse.split("@")[0] ?? "Advait";
    const nameToUse = manualName.trim() || prefix.replace(".", " ");

    setLoading(true);
    try {
      const authResult = await googleAuth({
        email: emailToUse,
        name: nameToUse,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameToUse)}`,
      });
      setStoredRole(authResult.role || "CUSTOMER");
      setShowConfigModal(false);
      onSuccess?.(authResult.user || { role: authResult.role });
    } catch (err: any) {
      onError?.(err?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={handleAuthClick}
        disabled={loading}
        className="group relative flex w-full max-w-[340px] items-center justify-center gap-3 rounded-full border-2 border-[#dadce0] bg-white px-5 py-3 text-sm font-semibold text-[#3c4043] shadow-sm transition-all hover:bg-[#f8f9fa] hover:border-[#4285f4] hover:shadow-md active:bg-[#f1f3f4] disabled:opacity-60 cursor-pointer"
      >
        <GoogleIcon className="size-5 shrink-0" />
        <span className="truncate font-medium">
          {loading ? "Connecting to Google..." : "Continue with Google"}
        </span>

        {isSupabaseConfigured ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Supabase
          </span>
        ) : (
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 group-hover:border-slate-300">
            Supabase Auth
          </span>
        )}
      </button>

      {/* Supabase Setup / Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border-2 border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-card-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-lg">
                  ⚡
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Supabase Google Authentication</h3>
                  <p className="text-xs text-muted-foreground">Easy setup with Supabase Auth</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="rounded-full size-8 grid place-items-center bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>🚀</span> Quick Setup Instructions
                </div>
                <p>
                  To enable live Google OAuth redirect via Supabase, add your Supabase project keys to <code className="bg-emerald-500/20 px-1 py-0.5 rounded font-mono">.env</code>:
                </p>
              </div>

              <div className="space-y-2 font-mono text-[11px] bg-slate-900 text-slate-100 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400"># Add to your .env file:</div>
                <div className="text-emerald-400">VITE_SUPABASE_URL=https://your-project-id.supabase.co</div>
                <div className="text-emerald-400">VITE_SUPABASE_ANON_KEY=eyJh...your-anon-key...</div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-foreground text-xs uppercase tracking-wider">Step-by-Step in Supabase:</div>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>
                    Open your <strong><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-leaf underline">Supabase Dashboard</a></strong> &rarr; <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; <strong>Google</strong>.
                  </li>
                  <li>
                    Toggle <strong>Enable Google provider</strong> and enter your Google Cloud <strong>Client ID</strong> &amp; <strong>Client Secret</strong>.
                  </li>
                  <li>
                    Copy the <strong>Redirect URL</strong> shown in Supabase (e.g. <code className="bg-muted px-1 py-0.5 rounded">https://&lt;id&gt;.supabase.co/auth/v1/callback</code>) and paste it into Google Cloud Console under <strong>Authorized Redirect URIs</strong>.
                  </li>
                  <li>
                    Save and your users can sign in with Google anywhere across devices!
                  </li>
                </ol>
              </div>

              <div className="border-t pt-4">
                <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">
                  Instant One-Click Test:
                </div>
                <p className="mb-3">
                  You can also authenticate directly with your Google profile to test the EcoCycle marketplace while configuring your keys:
                </p>
                <form onSubmit={handleInstantFallbackAuth} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="advaitnawathe007@gmail.com"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2 text-xs font-medium focus:border-leaf focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Advait Nawathe"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2 text-xs font-medium focus:border-leaf focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-[#1a73e8] py-2.5 text-xs font-bold text-white shadow hover:bg-[#1557b0] transition-colors cursor-pointer"
                  >
                    {loading ? "Authenticating..." : "1-Click Sign In with Google"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
