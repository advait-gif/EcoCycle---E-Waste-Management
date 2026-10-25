import { useEffect, useState } from "react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { GoogleIcon } from "./GoogleIcon";
import { getToken, getMe, setStoredRole } from "@/lib/api";
import { useBackend } from "@/hooks/use-backend";

interface GoogleAuthPromptModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const DISMISS_KEY = "ecocycle_google_prompt_dismissed";

export function GoogleAuthPromptModal({ forceOpen = false, onClose }: GoogleAuthPromptModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { switchRole, isOnline } = useBackend();
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Check if user is already logged in
    const token = getToken();
    if (!token) {
      // Check if dismissed in this specific session
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (!dismissed) {
        // App opened: display right at the start!
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    } else {
      getMe().then(setUser).catch(() => {});
    }
    return undefined;
  }, [forceOpen]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setIsOpen(false);
    onClose?.();
  };

  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    setIsOpen(false);
    onClose?.();
    window.location.reload();
  };

  const handleQuickRole = async (roleKey: "customer" | "collector" | "recycler") => {
    setRoleLoading(roleKey);
    try {
      await switchRole(roleKey);
      setStoredRole(roleKey.toUpperCase());
      handleDismiss();
      window.location.reload();
    } catch (e) {
      console.warn("Quick role switch error:", e);
    } finally {
      setRoleLoading(null);
    }
  };

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Dark backdrop with blur */}
      <div
        className="fixed inset-0 bg-ink/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-border bg-card p-6 sm:p-8 shadow-2xl transition-all animate-in zoom-in-95 duration-200 text-card-foreground">
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-cream text-muted-foreground hover:bg-muted hover:text-foreground font-bold transition-colors"
          title="Close or explore as guest"
        >
          ✕
        </button>

        {/* Header with EcoCycle + Google emblem */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-cream px-3 py-1 text-xs font-bold shadow-sm">
            <span className="grid size-5 place-items-center rounded-full bg-leaf text-white text-[11px]">
              ♻
            </span>
            <span>EcoCycle Marketplace</span>
            <span className="text-muted-foreground">×</span>
            <GoogleIcon className="size-4" />
            <span className="text-[#4285F4]">Google Auth</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Sign In to EcoCycle
          </h2>

          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Connect using your Google account to request e-waste doorstep pickups, earn eco-reward points, and verify authentic recycling certificates.
          </p>
        </div>

        {/* Google Real Sign-in Action Box */}
        <div className="mt-6 rounded-2xl border-2 border-dashed border-leaf/40 bg-leaf/5 p-5 text-center space-y-4">
          <div className="text-xs font-bold tracking-wide uppercase text-leaf">
            ⚡ Primary Sign-In Method
          </div>

          <GoogleSignInButton
            onSuccess={handleAuthSuccess}
            text="continue_with"
            promptOneTap={false}
          />

          <div className="text-[11px] text-muted-foreground">
            Fast Google Sign-In with 1-click verified accounts.
          </div>
        </div>

        {/* Demo Fast Access Option */}
        <div className="mt-6 space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase">
              Or Instant Role Access
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={!!roleLoading}
              onClick={() => handleQuickRole("customer")}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-cream p-2.5 text-center hover:bg-lime/20 hover:border-lime transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="text-xl">👤</span>
              <span className="text-xs font-bold">Customer</span>
              <span className="text-[10px] text-muted-foreground">Pooja</span>
            </button>

            <button
              type="button"
              disabled={!!roleLoading}
              onClick={() => handleQuickRole("collector")}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-cream p-2.5 text-center hover:bg-lime/20 hover:border-lime transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="text-xl">🛵</span>
              <span className="text-xs font-bold">Collector</span>
              <span className="text-[10px] text-muted-foreground">Rajesh</span>
            </button>

            <button
              type="button"
              disabled={!!roleLoading}
              onClick={() => handleQuickRole("recycler")}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-cream p-2.5 text-center hover:bg-lime/20 hover:border-lime transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="text-xl">🏭</span>
              <span className="text-xs font-bold">Recycler</span>
              <span className="text-[10px] text-muted-foreground">Facility</span>
            </button>
          </div>
        </div>

        {/* Footer: Explore as guest */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground font-semibold underline underline-offset-4"
          >
            Explore as Guest first →
          </button>
          <a
            href="/login"
            className="font-bold text-leaf hover:underline"
            onClick={handleDismiss}
          >
            Standard Email/Password Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
