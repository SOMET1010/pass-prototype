import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { StoreProvider } from "./store/store";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import TableauDeBord from "./pages/TableauDeBord";
import Decisions from "./pages/Decisions";
import Jalons from "./pages/Jalons";
import Chantiers from "./pages/Chantiers";
import Taches from "./pages/Taches";
import Risques from "./pages/Risques";
import Documents from "./pages/Documents";
import Partenaires from "./pages/Partenaires";
import Seances from "./pages/Seances";

function Prive({ children }: { children: JSX.Element }) {
  const { role } = useAuth();
  return role ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Prive><Layout /></Prive>}>
              <Route index element={<TableauDeBord />} />
              <Route path="decisions" element={<Decisions />} />
              <Route path="jalons" element={<Jalons />} />
              <Route path="chantiers" element={<Chantiers />} />
              <Route path="taches" element={<Taches />} />
              <Route path="risques" element={<Risques />} />
              <Route path="documents" element={<Documents />} />
              <Route path="partenaires" element={<Partenaires />} />
              <Route path="seances" element={<Seances />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
