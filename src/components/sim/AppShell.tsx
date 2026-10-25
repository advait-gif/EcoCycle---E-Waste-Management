import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSim, useSimulationLoop } from "@/lib/simulation/react";
import { useBackend } from "@/hooks/use-backend";
import { GoogleAuthPromptModal } from "@/components/auth/GoogleAuthPromptModal";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { getToken, getMe, logout } from "@/lib/api";
import { signOutSupabase } from "@/lib/supabase";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/pickups", label: "Pickups" },
  { to: "/recycling", label: "Recycling" },
  { to: "/centers", label: "Facilities" },
  { to: "/agents", label: "Collectors" },
  { to: "/rewards", label: "Rewards & Impact" },
  { to: "/control", label: "Operations" },
  { to: "/login", label: "Account" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const s = useSim();
  const [mounted, setMounted] = useState(false);
  const { isOnline, currentRole } = useBackend();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  useSimulationLoop();

  useEffect(() => {
    setMounted(true);
    const syncUser = () => {
      if (getToken()) {
        getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
      } else {
        setCurrentUser(null);
      }
    };
    syncUser();
    window.addEventListener("ecocycle-auth-change", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("ecocycle-auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Welcome Google Auth Prompt Modal */}
      <GoogleAuthPromptModal
        forceOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <div>
        {/* Top Operations Header Strip */}
        <div className="bg-ink text-ink-foreground border-b border-ink/40">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-6 py-2.5 text-[12px]">
            <span className="font-display inline-flex items-center gap-1.5 rounded-full bg-leaf px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-leaf-foreground uppercase shadow-sm">
              ● Live Network Active
            </span>
            <span className="text-muted-foreground hidden md:inline">
              Bengaluru Metro Hub · CPCB Authorized Recycler Network &amp; Verifiable Chain of Custody
            </span>
            <div className="ml-auto flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
              <span className="hidden sm:inline">24x7 Operations Support: 1800-ECO-CYCLE</span>
              <span className="font-mono text-emerald-400 font-bold">API v1.0 Live</span>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <header className="border-b-2 border-border bg-card sticky top-0 z-50 shadow-sm backdrop-blur-md bg-card/95">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-6 px-6 py-3.5">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="font-display grid size-10 place-items-center rounded-2xl bg-leaf text-xl font-bold text-leaf-foreground shadow-sm group-hover:scale-105 transition-transform">
                ♻
              </div>
              <div>
                <div className="font-display text-2xl leading-none font-extrabold tracking-tight">EcoCycle</div>
                <div className="text-[11px] font-bold text-muted-foreground tracking-wide uppercase">E-Waste Marketplace</div>
              </div>
            </Link>

            <nav className="ml-4 hidden items-center gap-1 text-sm font-semibold lg:flex">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  activeProps={{ className: "bg-ink text-ink-foreground shadow-sm" }}
                  inactiveProps={{ className: "hover:bg-ink/5 text-foreground/80 hover:text-foreground" }}
                  className="rounded-full px-3.5 py-2 transition-all text-xs font-bold"
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3">
              {/* Primary Book Pickup CTA */}
              <Link
                to="/pickups"
                className="font-display inline-flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-leaf/90 transition-all active:translate-y-0.5"
              >
                <span>📦</span>
                <span>Book Pickup</span>
              </Link>

              {/* Google Authentication Trigger in Header */}
              {mounted && (currentUser || getToken()) ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="font-display inline-flex items-center gap-2 rounded-full border-2 border-border bg-cream px-3 py-1.5 text-xs font-bold text-ink hover:bg-lime/30 transition-all active:translate-y-0.5"
                  >
                    {currentUser?.picture ? (
                      <img
                        src={currentUser.picture}
                        alt={currentUser?.name || "Avatar"}
                        className="size-5 rounded-full object-cover"
                      />
                    ) : (
                      <span>👤</span>
                    )}
                    <span className="max-w-[120px] truncate">{currentUser?.name || currentUser?.email || "My Account"}</span>
                  </Link>
                  <button
                    type="button"
                    title="Sign Out of EcoCycle"
                    onClick={() => {
                      logout();
                      signOutSupabase();
                    }}
                    className="rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-coral/10 hover:text-coral hover:border-coral transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="font-display inline-flex items-center gap-2 rounded-full border-2 border-border bg-white px-3.5 py-1.5 text-xs font-bold text-[#3c4043] shadow-sm hover:bg-cream hover:border-leaf transition-all active:translate-y-0.5 cursor-pointer"
                  >
                    <GoogleIcon className="size-4 shrink-0" />
                    <span className="hidden sm:inline">Sign In with Google</span>
                    <span className="sm:hidden">Google</span>
                  </button>
                  <Link
                    to="/login"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-cream transition-all"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>
      </div>

      <footer className="border-t-2 border-border/60 bg-card/60 mt-16 py-8">
        <div className="mx-auto max-w-[1440px] px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-leaf font-bold">♻ EcoCycle</span>
            <span>· India&apos;s Responsible E-Waste Management &amp; Recycling Marketplace</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:underline">Overview</Link>
            <Link to="/pickups" className="hover:underline">Categories & Pickups</Link>
            <Link to="/rewards" className="hover:underline">Eco-Rewards</Link>
            <Link to="/control" className="hover:underline">System Status</Link>
          </div>
          <div>
            &copy; 2026 EcoCycle Technologies India. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
