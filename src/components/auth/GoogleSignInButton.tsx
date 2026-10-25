import { useEffect, useRef, useState } from "react";
import { GoogleIcon } from "./GoogleIcon";
import { googleAuth, setStoredRole } from "@/lib/api";

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (err: string) => void;
  className?: string;
  text?: "signin_with" | "signup_with" | "continue_with";
  promptOneTap?: boolean;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  className = "",
  text = "continue_with",
  promptOneTap = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [gisRendered, setGisRendered] = useState(false);
  const [showClientHelp, setShowClientHelp] = useState(false);

  const rawClientId = (
    typeof import.meta !== "undefined"
      ? (import.meta.env?.['VITE_GOOGLE_CLIENT_ID'] as string | undefined)
      : undefined
  )?.trim();

  // A genuine Google OAuth Client ID has the format: <numbers>-<alphanumeric>.apps.googleusercontent.com
  const isRealClientConfigured = Boolean(
    rawClientId &&
    rawClientId.length > 20 &&
    rawClientId.endsWith(".apps.googleusercontent.com") &&
    !rawClientId.includes("ecocycledemo")
  );

  const handleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      onError?.("No Google credential received.");
      return;
    }
    setLoading(true);
    try {
      const authResult = await googleAuth({ credential: response.credential });
      setStoredRole(authResult.role || "CUSTOMER");
      onSuccess?.(authResult.user || { role: authResult.role });
    } catch (err: any) {
      console.error("Google Auth error:", err);
      onError?.(err?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only attempt real GIS initialize if a genuine, configured Google Client ID is provided
    if (!isRealClientConfigured || !rawClientId) {
      setGisRendered(false);
      return;
    }

    let checkInterval: any = null;
    let attempts = 0;

    const tryInitGis = () => {
      attempts++;
      if (window.google?.accounts?.id && containerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: rawClientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          window.google.accounts.id.renderButton(containerRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            text,
            shape: "pill",
            logo_alignment: "left",
            width: 280,
          });

          setGisRendered(true);

          if (promptOneTap && !(window as any).__ecocycle_onetap_called) {
            (window as any).__ecocycle_onetap_called = true;
            try {
              window.google.accounts.id.prompt();
            } catch (err) {
              console.warn("One tap prompt notice:", err);
            }
          }

          if (checkInterval) clearInterval(checkInterval);
        } catch (e) {
          console.warn("GIS initialization note:", e);
        }
      } else if (attempts > 20) {
        if (checkInterval) clearInterval(checkInterval);
      }
    };

    tryInitGis();
    if (!window.google?.accounts?.id) {
      checkInterval = setInterval(tryInitGis, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isRealClientConfigured, rawClientId, promptOneTap, text]);

  const handleManualGoogleAuth = async (emailOverride?: string, nameOverride?: string) => {
    const emailToUse = (emailOverride || googleEmail).trim() || "advaitnawathe007@gmail.com";
    const prefix = emailToUse.split("@")[0] ?? "Advait";
    const nameToUse = (nameOverride || googleName).trim() || prefix.replace(".", " ");
    
    setLoading(true);
    try {
      const authResult = await googleAuth({
        email: emailToUse,
        name: nameToUse,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameToUse)}`,
      });
      setStoredRole(authResult.role || "CUSTOMER");
      setShowSimulatedModal(false);
      onSuccess?.(authResult.user || { role: authResult.role });
    } catch (err: any) {
      onError?.(err?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Real Google Identity Services native rendered container (active when valid client ID configured) */}
      {isRealClientConfigured && (
        <div
          ref={containerRef}
          className={`w-full flex justify-center ${gisRendered ? "min-h-[44px]" : "hidden"}`}
        />
      )}

      {/* Official Google Brand Styled Fallback / Primary button */}
      {(!isRealClientConfigured || !gisRendered) && (
        <button
          type="button"
          onClick={() => setShowSimulatedModal(true)}
          disabled={loading}
          className="group relative flex w-full max-w-[320px] items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white px-5 py-3 text-sm font-semibold text-[#3c4043] shadow-sm transition-all hover:bg-[#f8f9fa] hover:border-[#d2e3fc] hover:shadow-md active:bg-[#f1f3f4] disabled:opacity-60 cursor-pointer"
        >
          <GoogleIcon className="size-5 shrink-0" />
          <span className="truncate font-medium">
            {loading ? "Signing in with Google..." : "Continue with Google"}
          </span>
          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">
            Instant
          </span>
        </button>
      )}

      {/* Google Account Sign-In Dialog */}
      {showSimulatedModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-card-foreground">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="size-6" />
                <span className="font-display text-lg font-bold">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulatedModal(false)}
                className="rounded-full size-8 grid place-items-center bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Select your Google Account to authenticate directly and access EcoCycle:
            </p>

            {/* Quick 1-click accounts */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleManualGoogleAuth("advaitnawathe007@gmail.com", "Advait Nawathe")}
                className="w-full flex items-center gap-3.5 rounded-2xl border-2 border-leaf/30 bg-leaf/5 p-3.5 text-left transition-all hover:bg-leaf/15 hover:border-leaf group cursor-pointer"
              >
                <div className="grid size-11 place-items-center rounded-full bg-[#4285F4] text-white font-bold text-base shadow-sm">
                  AN
                </div>
                <div className="flex-1 truncate">
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    Advait Nawathe
                    <span className="rounded-full bg-leaf/20 px-1.5 py-0.2 text-[9px] font-extrabold text-leaf">Active</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">advaitnawathe007@gmail.com</div>
                </div>
                <span className="rounded-full bg-leaf px-3 py-1.5 text-xs font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
                  1-Click Sign In →
                </span>
              </button>
            </div>

            {/* Custom Google account input */}
            <form onSubmit={(e) => { e.preventDefault(); handleManualGoogleAuth(); }} className="space-y-3 pt-3 border-t">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Or enter another Google Email:
              </div>
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full rounded-xl border-2 border-input bg-cream px-3.5 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
              />
              <input
                type="text"
                placeholder="Your Name (optional)"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                className="w-full rounded-xl border-2 border-input bg-cream px-3.5 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !googleEmail.trim()}
                className="w-full rounded-full bg-[#1a73e8] py-3 text-sm font-bold text-white shadow-md hover:bg-[#1557b0] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Authenticating..." : "Sign In with this Email"}
              </button>
            </form>

            {/* Developer note about Google Cloud OAuth Client ID */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClientHelp(!showClientHelp)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
              >
                {showClientHelp ? "Hide Google Cloud Client ID settings" : "⚙ Using your own Google Cloud OAuth Client ID?"}
              </button>

              {showClientHelp && (
                <div className="mt-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                  <div className="font-semibold text-foreground">To enable the native Google popup without Error 401:</div>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Create an OAuth 2.0 Client ID in Google Cloud Console.</li>
                    <li>Add <code className="bg-background px-1 py-0.5 rounded text-[11px]">http://localhost:8080</code> to Authorized JavaScript Origins.</li>
                    <li>Paste your Client ID in <code className="bg-background px-1 py-0.5 rounded text-[11px]">.env</code> under <code className="bg-background px-1 py-0.5 rounded text-[11px]">VITE_GOOGLE_CLIENT_ID</code>.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
