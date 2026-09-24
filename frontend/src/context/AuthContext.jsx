import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, setAuthToken, getAuthToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const userData = await apiRequest("/api/auth/me");
      setUser(userData);
    } catch (err) {
      console.warn("Session check failed, clearing token:", err.message);
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();

    function handleAuthExpired() {
      setUser(null);
    }
    window.addEventListener("finguard_auth_expired", handleAuthExpired);
    return () => window.removeEventListener("finguard_auth_expired", handleAuthExpired);
  }, []);

  async function login(email, password) {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data;
  }

  async function register(name, email, password, phone = "") {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone }),
    });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data;
  }

  async function quickDemoLogin() {
    const data = await apiRequest("/api/demo/quick-login", {
      method: "POST",
    });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // Ignore
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, quickDemoLogin, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
