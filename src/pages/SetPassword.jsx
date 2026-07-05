import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const revisarSesion = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setLoading(false);
    };

    revisarSesion();
  }, []);

  const guardarPassword = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMensaje("");

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      await supabase.auth.signOut();
      setMensaje("Contraseña guardada correctamente. Ahora puedes iniciar sesión.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo crear la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Crear nueva contraseña</h1>
        <p style={styles.text}>
          Ingresa tu nueva contraseña para entrar a Ringo App. Este formulario sirve para invitaciones y recuperación de contraseña.
        </p>

        {loading ? (
          <div style={styles.success}>Validando enlace...</div>
        ) : !hasSession ? (
          <div style={styles.error}>
            El enlace no está activo o expiró. Vuelve a abrir el enlace desde tu correo o solicita nuevamente la recuperación de contraseña.
          </div>
        ) : (
          <form onSubmit={guardarPassword} style={styles.form}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              style={styles.input}
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
              style={styles.input}
            />

            <button type="submit" disabled={saving} style={{ ...styles.primaryButton, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}

        {mensaje && <div style={styles.success}>{mensaje}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <Link to="/login" style={styles.linkButton}>Ir al login</Link>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #250000 0%, #050505 45%, #000000 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "min(520px, 100%)",
    background: "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 0 35px rgba(220, 38, 38, 0.28)",
  },
  title: {
    fontSize: 38,
    margin: "0 0 8px",
    color: "#facc15",
    textShadow: "3px 3px 0 #dc2626, 0 0 16px rgba(250,204,21,0.55)",
  },
  text: {
    color: "#fef3c7",
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gap: 14,
    marginTop: 20,
  },
  input: {
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #dc2626",
    background: "#090909",
    color: "#facc15",
    fontSize: 16,
    fontWeight: 800,
  },
  primaryButton: {
    border: "none",
    padding: "14px 18px",
    borderRadius: 14,
    background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  success: {
    marginTop: 16,
    background: "#422006",
    color: "#facc15",
    padding: 14,
    borderRadius: 14,
    fontWeight: 700,
    border: "1px solid #facc15",
  },
  error: {
    marginTop: 16,
    background: "#450a0a",
    color: "#fecaca",
    padding: 14,
    borderRadius: 14,
    fontWeight: 700,
    border: "1px solid #dc2626",
  },
  linkButton: {
    display: "inline-block",
    marginTop: 16,
    color: "#facc15",
    fontWeight: 900,
    textDecoration: "none",
  },
};
