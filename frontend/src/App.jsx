import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import CommuterPage from "./pages/CommuterPage";
import DriverPage from "./pages/DriverPage";
import AdminPage from "./pages/AdminPage";
import CommunityPage from "./pages/CommunityPage";
import "leaflet/dist/leaflet.css";

function AppRouter() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(window.location.hash || "#/");

  useEffect(() => {
    function onHashChange() {
      setPage(window.location.hash || "#/");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  function renderPage() {
    if (page === "#/driver" && user?.role === "driver") return <DriverPage />;
    if (page === "#/admin" && user?.role === "admin") return <AdminPage />;
    if (page === "#/community") return <CommunityPage />;
    return <CommuterPage />;
  }

  return (
    <>
      <Navbar />
      <main className="main-content">{renderPage()}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
