import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  function saveSession(userData, tokenStr) {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem("token", tokenStr);
    localStorage.setItem("user", JSON.stringify(userData));
  }

  async function login(phone, password) {
    const data = await authApi.login({ phone, password });
    saveSession(data.user, data.token);
    return data;
  }

  async function signup(phone, password, name, role) {
    const data = await authApi.signup({ phone, password, name, role });
    saveSession(data.user, data.token);
    return data;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.hash = "#/";
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
