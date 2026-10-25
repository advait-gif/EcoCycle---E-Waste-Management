import { useState, useEffect, useCallback } from "react";
import {
  checkBackendHealth,
  ensureDemoLogin,
  getToken,
  getStoredRole,
  setStoredRole,
  DEMO_CREDENTIALS,
} from "@/lib/api";

export function useBackend() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [currentRole, setCurrentRole] = useState<string>(getStoredRole());
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const checkStatus = useCallback(async () => {
    const res = await checkBackendHealth();
    setIsOnline(res.ok);
    if (res.ok && !getToken()) {
      setIsAuthenticating(true);
      try {
        await ensureDemoLogin("customer");
      } catch (err) {
        console.warn("Auto-login error:", err);
      } finally {
        setIsAuthenticating(false);
      }
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const switchRole = async (role: "customer" | "collector" | "recycler" | "admin") => {
    setIsAuthenticating(true);
    try {
      await ensureDemoLogin(role);
      const roleName = DEMO_CREDENTIALS[role].role;
      setStoredRole(roleName);
      setCurrentRole(roleName);
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isOnline: !!isOnline,
    isLoading: isOnline === null || isAuthenticating,
    currentRole,
    switchRole,
    checkStatus,
  };
}
