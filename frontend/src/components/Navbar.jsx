import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Modal from "./Modal";

export default function Navbar() {
  const { user, login, signup, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ phone: "", password: "", name: "", role: "driver" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await signup(form.phone, form.password, form.name, form.role);
      } else {
        await login(form.phone, form.password);
      }
      setShowAuth(false);
      setForm({ phone: "", password: "", name: "", role: "driver" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function navigate(hash) {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => navigate("#/")}>
          <span className="navbar-icon">🚌</span>
          <span className="navbar-title">TrackMyBus</span>
        </div>

        <div className="navbar-links">
          <button className="nav-link" onClick={() => navigate("#/")}>
            Map
          </button>
          <button className="nav-link" onClick={() => navigate("#/community")}>
            Community
          </button>

          {user?.role === "driver" && (
            <button className="nav-link" onClick={() => navigate("#/driver")}>
              Driver Panel
            </button>
          )}

          {user?.role === "admin" && (
            <button className="nav-link" onClick={() => navigate("#/admin")}>
              Admin Panel
            </button>
          )}

          {user ? (
            <div className="nav-user">
              <span className="nav-user-name">{user.name}</span>
              <button className="btn btn-outline btn-sm" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAuth(true)}>
              Login
            </button>
          )}
        </div>
      </nav>

      {showAuth && (
        <Modal title={isSignup ? "Sign Up" : "Login"} onClose={() => setShowAuth(false)}>
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="form-error">{error}</div>}

            <input
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {isSignup && (
              <>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
              </>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
            </button>

            <p className="auth-toggle">
              {isSignup ? "Already have an account?" : "Need an account?"}{" "}
              <button type="button" className="link-btn" onClick={() => setIsSignup(!isSignup)}>
                {isSignup ? "Login" : "Sign Up"}
              </button>
            </p>
          </form>
        </Modal>
      )}
    </>
  );
}
