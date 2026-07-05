import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [revisandoSesion, setRevisandoSesion] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      if (data.session) {
        navigate("/menu", { replace: true });
        return;
      }

      setRevisandoSesion(false);
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const iniciarSesion = async (e) => {
    e.preventDefault();

    try {
      setCargando(true);
      setError("");
      setMensaje("");

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginError) throw loginError;

      setMensaje("Sesión iniciada.");
      navigate("/menu", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  };

  if (revisandoSesion) {
    return <div style={styles.loading}>Revisando sesión...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>RINGO</h1>
        <p style={styles.text}>
          Inicia sesión para subir tus propias tablas y jugar tus propios juegos.
        </p>

        <form onSubmit={iniciarSesion} style={styles.form}>
          <label style={styles.label}>
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              style={styles.input}
              required
            />
          </label>

          <label style={styles.label}>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              style={styles.input}
              required
            />
          </label>

          <button type="submit" disabled={cargando} style={{ ...styles.primaryButton, opacity: cargando ? 0.65 : 1 }}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div style={styles.linksBox}>
          <Link to="/forgot-password" style={styles.forgotLink}>
            ¿Olvidó su contraseña?
          </Link>
        </div>

        {mensaje && <div style={styles.success}>{mensaje}</div>}
        {error && <div style={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

const baseButton = {
  border: "none",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
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
    maxWidth: 520,
    background:
      "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 26,
    boxShadow: "0 0 35px rgba(220, 38, 38, 0.28)",
  },
  title: {
    fontSize: 46,
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
    gap: 16,
    marginTop: 22,
  },
  label: {
    display: "grid",
    gap: 8,
    color: "#facc15",
    fontWeight: 800,
  },
  input: {
    padding: "13px 16px",
    borderRadius: 14,
    border: "1px solid #dc2626",
    background: "#090909",
    color: "#facc15",
    fontSize: 16,
    fontWeight: 700,
    outline: "none",
  },
  primaryButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
    color: "white",
    width: "100%",
  },
  linksBox: {
    marginTop: 18,
    textAlign: "center",
  },
  forgotLink: {
    color: "#facc15",
    fontWeight: 900,
    textDecoration: "none",
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
};
