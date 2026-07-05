import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>RINGO</h1>

        <p style={styles.subtitle}>
          Sistema para cargar tablas, leer cartones y jugar ringo en vivo.
        </p>

        <div style={styles.grid}>
          <Link to="/subir" style={styles.option}>
            <h2 style={styles.optionTitle}>Subir archivo</h2>
            <p>
              Cargar PDF, recortar tablas, leer OCR y guardar en la base de datos.
            </p>
          </Link>

          <Link to="/jugar" style={styles.option}>
            <h2 style={styles.optionTitle}>Jugar RINGO</h2>
            <p>
              Ingresar bolas cantadas y detectar línea, esquinas, cuadrado o tabla llena.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #250000 0%, #050505 45%, #000000 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 920,
    background: "linear-gradient(145deg, #0a0a0a, #020202)",
    border: "1px solid #b91c1c",
    borderRadius: 28,
    padding: 32,
    boxShadow: "0 0 50px rgba(220, 38, 38, 0.25)",
  },

  title: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 6,
    color: "#facc15",
    textShadow:
      "4px 4px 0 #dc2626, 0 0 25px rgba(250,204,21,0.6)",
  },

  subtitle: {
    color: "#fef3c7",
    textAlign: "center",
    marginBottom: 32,
    fontSize: 16,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
  },

  option: {
    textDecoration: "none",
    color: "white",
    background: "#090909",
    border: "1px solid #dc2626",
    borderRadius: 22,
    padding: 24,
    minHeight: 180,
    boxShadow: "0 0 25px rgba(220,38,38,0.2)",
    transition: "all 0.2s ease",
  },

  optionTitle: {
    color: "#facc15",
    marginBottom: 10,
    textShadow: "2px 2px 0 #7f1d1d",
  },
};