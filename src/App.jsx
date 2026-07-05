import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import MenuPrincipal from "./pages/MenuPrincipal";
import SubirPDF from "./pages/SubirPDF";
import JugarBingo from "./pages/JugarBingo";
import AdminUsuarios from "./pages/AdminUsuarios";
import SetPassword from "./pages/SetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/set-password" element={<SetPassword />} />

        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <MenuPrincipal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/subir"
          element={
            <ProtectedRoute>
              <SubirPDF />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jugar"
          element={
            <ProtectedRoute>
              <JugarBingo />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Navigate to="/admin/usuarios" replace />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute>
              <AdminUsuarios />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
