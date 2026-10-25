import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardTitle, Chip, PopButton, SectionNote } from "@/components/sim/ui";
import { useBackend } from "@/hooks/use-backend";
import {
  login,
  getToken,
  setToken,
  getMe,
  DEMO_CREDENTIALS,
  setStoredRole,
  apiFetch,
} from "@/lib/api";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — EcoCycle" },
      {
        name: "description",
        content: "Sign in to your EcoCycle account or create a new participant account.",
      },
      { property: "og:title", content: "Sign In — EcoCycle" },
      { property: "og:description", content: "EcoCycle Authentication Portal" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isOnline, switchRole, currentRole } = useBackend();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (isOnline && getToken()) {
      getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
    }
  }, [isOnline]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(identifier, password);
      setCurrentUser(data.user);
      setStoredRole(data.user?.role || "CUSTOMER");
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email: identifier,
          password,
          role,
          consent: true,
        }),
      });
      const data = await login(identifier, password);
      setCurrentUser(data.user);
      setStoredRole(data.user?.role || role);
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoKey: "customer" | "collector" | "recycler" | "admin") => {
    setError(null);
    setLoading(true);
    try {
      await switchRole(demoKey);
      const user = await getMe();
      setCurrentUser(user);
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err?.message || "Quick login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold">
          {currentUser ? "My Account" : mode === "login" ? "Sign In to EcoCycle" : "Create an Account"}
        </h1>
        <SectionNote>
          {isOnline
            ? "⚡ Live FastAPI Authentication with Argon2id Password Hashing & JWT Sessions."
            : "Backend is offline. Running in simulation mode."}
        </SectionNote>
      </header>

      {currentUser ? (
        <Card>
          <CardTitle
            title="Active Session"
            badge={<Chip tone="lime">{currentUser.role || currentRole}</Chip>}
          />
          <div className="space-y-4">
            <div className="rounded-2xl bg-cream p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Logged in as</div>
              <div className="font-display text-lg font-bold">{currentUser.name || currentUser.email}</div>
              <div className="font-mono text-xs text-muted-foreground">{currentUser.email || currentUser.phone}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-leaf/20 px-2.5 py-1 text-xs font-semibold text-leaf">
                <span className="size-2 rounded-full bg-leaf" /> Active · Role: {currentUser.role}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <PopButton tone="ink" className="flex-1" onClick={() => navigate({ to: "/" })}>
                Go to Dashboard
              </PopButton>
              <PopButton tone="outline" onClick={handleLogout}>
                Sign Out
              </PopButton>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="mb-6 flex rounded-2xl bg-cream p-1">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                  mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                  mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Register
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                {error}
              </div>
            ) : null}

            {/* Google Authentication Box */}
            <div className="mb-6 rounded-2xl border-2 border-dashed border-leaf/40 bg-leaf/5 p-4 text-center space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-leaf">
                Real Google Sign-In
              </div>
              <GoogleSignInButton
                onSuccess={(u) => {
                  setCurrentUser(u);
                  navigate({ to: "/" });
                }}
                onError={(err) => setError(err)}
                text={mode === "login" ? "signin_with" : "signup_with"}
                promptOneTap={true}
              />
              <div className="text-[11px] text-muted-foreground">
                Official Google Identity authentication with One-Tap sign-in.
              </div>
            </div>

            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase">
                Or continue with password
              </span>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">EMAIL OR PHONE</label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. customer@test.demo"
                    className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">PASSWORD</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
                  />
                </div>

                <PopButton
                  type="submit"
                  tone="ink"
                  className="mt-2 w-full py-3.5"
                  disabled={loading || !identifier || !password}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </PopButton>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pooja Verma"
                    className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. pooja@example.com"
                    className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">ROLE</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
                  >
                    <option value="CUSTOMER">Customer (Household / Business)</option>
                    <option value="COLLECTOR">Collector (Collection Partner)</option>
                    <option value="RECYCLER">Recycler (Authorized Facility)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">PASSWORD (8+ CHARACTERS)</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-medium focus:border-leaf focus:outline-none"
                  />
                </div>

                <PopButton
                  type="submit"
                  tone="ink"
                  className="mt-2 w-full py-3.5"
                  disabled={loading || !identifier || !password || !name}
                >
                  {loading ? "Creating account..." : "Register & Sign In"}
                </PopButton>
              </form>
            )}
          </Card>

          <Card>
            <CardTitle
              title="One-Click Demo Roles"
              badge={<Chip tone="sun">Instant Access</Chip>}
            />
            <p className="mb-4 text-xs text-muted-foreground">
              Pre-configured seed accounts for fast testing of every marketplace role in real time:
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => handleQuickDemo("customer")}
                className="flex flex-col items-center gap-1 rounded-2xl bg-cream p-3 text-center transition-all hover:bg-lime/20"
              >
                <span className="text-xl">👤</span>
                <span className="text-xs font-bold">Customer</span>
                <span className="font-mono text-[10px] text-muted-foreground">Pooja</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("collector")}
                className="flex flex-col items-center gap-1 rounded-2xl bg-cream p-3 text-center transition-all hover:bg-lime/20"
              >
                <span className="text-xl">🛵</span>
                <span className="text-xs font-bold">Collector</span>
                <span className="font-mono text-[10px] text-muted-foreground">Rajesh</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("recycler")}
                className="flex flex-col items-center gap-1 rounded-2xl bg-cream p-3 text-center transition-all hover:bg-lime/20"
              >
                <span className="text-xl">🏭</span>
                <span className="text-xs font-bold">Recycler</span>
                <span className="font-mono text-[10px] text-muted-foreground">GreenEarth</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("admin")}
                className="flex flex-col items-center gap-1 rounded-2xl bg-cream p-3 text-center transition-all hover:bg-lime/20"
              >
                <span className="text-xl">⚙️</span>
                <span className="text-xs font-bold">Admin</span>
                <span className="font-mono text-[10px] text-muted-foreground">Ops Team</span>
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
