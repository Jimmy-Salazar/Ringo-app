import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const enviarRecuperacion = async (e) => {
    e.preventDefault();

    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio) {
      setError("Ingresa tu correo.");
      return;
    }

    try {
      setEnviando(true);
      setError("");
      setMensaje("");

      const { data, error: functionError } = await supabase.functions.invoke(
        "forgot-password",
        {
          body: {
            email: emailLimpio,
            redirectTo: `${window.location.origin}/set-password`,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data?.ok) {
        setError(data?.message || "Este correo no está registrado como usuario.");
        return;
      }

      setMensaje(
        "Correo enviado. Revisa tu bandeja de entrada y abre el enlace para crear una nueva contraseña."
      );
      setEmail("");
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo enviar el correo de recuperación.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Recuperar contraseña</h1>
        <p style={styles.text}>
          Ingresa tu correo. Primero verificaremos si está registrado como usuario
          de Ringo App. Si existe, recibirás un enlace para crear una nueva contraseña.
        </p>

        <form onSubmit={enviarRecuperacion} style={styles.form}>
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

          <button
            type="submit"
            disabled={enviando}
            style={{ ...styles.primaryButton, opacity: enviando ? 0.65 : 1 }}
          >
            {enviando ? "Verificando..." : "Verificar y enviar recuperación"}
          </button>
        </form>

        {mensaje && <div style={styles.success}>{mensaje}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <Link to="/login" style={styles.linkButton}>
          Volver al login
        </Link>
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
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #250000 0%, #050505 45%, #000000 100%)",
    color: "white",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
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
    marginTop: 18,
    color: "#facc15",
    fontWeight: 900,
    textDecoration: "none",
  },
};
