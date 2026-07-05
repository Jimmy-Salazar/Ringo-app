import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const validarAdmin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData.session;

      if (!mounted) return;

      setSession(currentSession);

      if (!currentSession?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, activo")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error(error);
        setIsAdmin(false);
      } else {
        setIsAdmin(profile?.role === "admin" && profile?.activo === true);
      }

      setLoading(false);
    };

    validarAdmin();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      validarAdmin();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div style={styles.loading}>Validando permisos de administrador...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/menu" replace />;
  }

  return children;
}

const styles = {
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#020617",
    color: "#facc15",
    fontWeight: 900,
    fontSize: 18,
  },
};
