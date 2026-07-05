import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function MenuPrincipal() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = profile?.role === "admin" && profile?.activo === true;

  useEffect(() => {
    let mounted = true;

    const cargarUsuario = async () => {
      try {
        setError("");

        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData.session;

        if (!mounted) return;

        if (!currentSession?.user) {
          navigate("/login", { replace: true });
          return;
        }

        setSession(currentSession);

        const { data: perfil, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, nombre, role, activo")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!mounted) return;

        setProfile(perfil || null);
      } catch (err) {
        console.error(err);
        setError(err.message || "No se pudo cargar el perfil del usuario.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    cargarUsuario();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return <div style={styles.loading}>Cargando menú...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerBadge}>
          {isAdmin ? "Administrador" : "Usuario"}
        </div>

        <h1 style={styles.title}>Menú Ringo</h1>

        <p style={styles.text}>
          Sesión activa: <strong>{session?.user?.email}</strong>
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          <Link to="/subir" style={styles.primaryButton}>
            Subir Tablas
          </Link>

          <Link to="/jugar" style={styles.secondaryButton}>
            Jugar Ringo
          </Link>

          {isAdmin && (
            <>
              <Link to="/admin/usuarios" style={styles.adminButton}>
                Administración
              </Link>

              <Link to="/home" style={styles.homeButton}>
                Home
              </Link>
            </>
          )}

          <button type="button" onClick={cerrarSesion} style={styles.dangerButton}>
            Cerrar Sesión
          </button>
        </div>

        {!isAdmin && (
          <p style={styles.helperText}>
            Tu usuario puede subir tablas y jugar Ringo con sus propios juegos.
          </p>
        )}

        {isAdmin && (
          <p style={styles.helperText}>
            Como administrador puedes entrar directo a Administración para crear usuarios.
          </p>
        )}
      </div>
    </div>
  );
}

const baseButton = {
  border: "none",
  padding: "15px 18px",
  borderRadius: 16,
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
  color: "white",
  fontSize: 16,
};

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
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #250000 0%, #050505 45%, #000000 100%)",
    color: "white",
    padding: 20,
    display: "grid",
    placeItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 640,
    background:
      "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 0 35px rgba(220, 38, 38, 0.28)",
  },
  headerBadge: {
    display: "inline-block",
    background: "rgba(250, 204, 21, 0.14)",
    border: "1px solid rgba(250, 204, 21, 0.7)",
    color: "#facc15",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 900,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    margin: "0 0 10px",
    color: "#facc15",
    textShadow: "3px 3px 0 #dc2626, 0 0 16px rgba(250,204,21,0.55)",
  },
  text: {
    color: "#fef3c7",
    lineHeight: 1.55,
    marginBottom: 22,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  primaryButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
  },
  secondaryButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #facc15, #ca8a04)",
    color: "#111",
  },
  adminButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #2563eb, #1e3a8a)",
  },
  homeButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #16a34a, #14532d)",
  },
  dangerButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #ef4444, #991b1b)",
  },
  helperText: {
    color: "#fde68a",
    marginTop: 20,
    lineHeight: 1.5,
    fontSize: 14,
  },
  error: {
    marginBottom: 16,
    background: "#450a0a",
    color: "#fecaca",
    padding: 14,
    borderRadius: 14,
    fontWeight: 700,
    border: "1px solid #dc2626",
  },
};
