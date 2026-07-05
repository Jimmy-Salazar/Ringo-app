import { Link } from "react-router-dom";

export default function AdminInicio() {
  const adminUrl = "http://localhost:5173/admin/usuarios";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerBadge}>Panel de administrador</div>

        <h1 style={styles.title}>Administración Ringo</h1>

        <p style={styles.text}>
          Desde esta sección puedes ingresar al módulo para crear y administrar usuarios.
        </p>

        <div style={styles.urlBox}>{adminUrl}</div>

        <div style={styles.actions}>
          <Link to="/admin/usuarios" style={styles.primaryButton}>
            Ir a administrar usuarios
          </Link>

          <Link to="/menu" style={styles.secondaryButton}>
            Volver al menú
          </Link>

          <Link to="/home" style={styles.homeButton}>
            Volver al Home
          </Link>
        </div>
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
    background:
      "radial-gradient(circle at top, #250000 0%, #050505 45%, #000000 100%)",
    color: "white",
    padding: 20,
    display: "grid",
    placeItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 620,
    background:
      "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 26,
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
    fontSize: 38,
    margin: "0 0 10px",
    color: "#facc15",
    textShadow: "3px 3px 0 #dc2626, 0 0 16px rgba(250,204,21,0.55)",
  },
  text: {
    color: "#fef3c7",
    lineHeight: 1.55,
    marginBottom: 18,
  },
  urlBox: {
    background: "#020617",
    border: "1px solid #334155",
    color: "#93c5fd",
    padding: 16,
    borderRadius: 16,
    fontWeight: 800,
    wordBreak: "break-word",
    marginBottom: 22,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  primaryButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
    color: "white",
  },
  secondaryButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #facc15, #ca8a04)",
    color: "#111",
  },
  homeButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #16a34a, #14532d)",
    color: "white",
  },
};
