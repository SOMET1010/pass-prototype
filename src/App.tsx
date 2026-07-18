import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Accueil } from "./pages/Accueil";
import { Enrolement } from "./pages/Enrolement";
import { Dossiers } from "./pages/Dossiers";
import { Verification } from "./pages/Verification";
import { Remise } from "./pages/Remise";
import { Recu } from "./pages/Recu";
import { Supervision } from "./pages/Supervision";
import { APropos } from "./pages/APropos";

function Protected({ children }: { children: JSX.Element }) {
  const { session, agent, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-400">Chargement…</div>
    );
  }
  if (!session || !agent) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Accueil /></Protected>} />
      <Route path="/enrolement" element={<Protected><Enrolement /></Protected>} />
      <Route path="/dossiers" element={<Protected><Dossiers /></Protected>} />
      <Route path="/verification/:id" element={<Protected><Verification /></Protected>} />
      <Route path="/remise/:id" element={<Protected><Remise /></Protected>} />
      <Route path="/recu/:id" element={<Protected><Recu /></Protected>} />
      <Route path="/supervision" element={<Protected><Supervision /></Protected>} />
      <Route path="/a-propos" element={<Protected><APropos /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
