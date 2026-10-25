import { useState, useEffect, useCallback } from "react";
import {
  checkBackendHealth,
  ensureDemoLogin,
  getToken,
  getStoredRole,
  setStoredRole,
  logout,
  DEMO_CREDENTIALS,
} from "@/lib/api";

export function useBackend() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [currentRole, setCurrentRole] = useState<string>(getToken() ? getStoredRole() : "");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const checkStatus = useCallback(async () => {
    const res = await checkBackendHealth();
    setIsOnline(res.ok);
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    const onAuthChange = () => {
      const token = getToken();
      setCurrentRole(token ? getStoredRole() : "");
    };
    window.addEventListener("ecocycle-auth-change", onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener("ecocycle-auth-change", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, []);

  const switchRole = async (role: "collector" | "recycler" | "admin") => {
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

  const logoutUser = () => {
    logout();
    setCurrentRole("");
  };

  return {
    isOnline: !!isOnline,
    isLoading: isOnline === null || isAuthenticating,
    currentRole,
    switchRole,
    logoutUser,
    checkStatus,
  };
}
