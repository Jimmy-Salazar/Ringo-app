import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminUsuarios() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      setError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,nombre,role,activo,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const crearUsuario = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim().toLowerCase();

    if (!nombreLimpio) {
      setError("Ingresa el nombre del usuario.");
      return;
    }

    if (!emailLimpio) {
      setError("Ingresa el correo del usuario.");
      return;
    }

    try {
      setCreando(true);
      setError("");
      setMensaje("");

      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          nombre: nombreLimpio,
          email: emailLimpio,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMensaje(`Usuario invitado correctamente. Se envió un correo a ${emailLimpio} para que cree su contraseña.`);
      setNombre("");
      setEmail("");
      await cargarUsuarios();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo crear/invitar al usuario.");
    } finally {
      setCreando(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <span style={styles.badge}>Administrador</span>
            <h1 style={styles.title}>Usuarios Ringo</h1>
            <p style={styles.text}>
              Crea usuarios ingresando solo nombre y correo. El sistema enviará una invitación para que cada usuario cree su propia contraseña.
            </p>
          </div>

          <Link to="/menu" style={styles.backButton}>
            Volver al menú
          </Link>
        </div>

        <form onSubmit={crearUsuario} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@correo.com"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={creando} style={{ ...styles.primaryButton, opacity: creando ? 0.6 : 1 }}>
            {creando ? "Enviando invitación..." : "Crear usuario e invitar"}
          </button>
        </form>

        {mensaje && <div style={styles.success}>{mensaje}</div>}
        {error && <div style={styles.error}>{error}</div>}
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h2>Usuarios registrados</h2>
          <button onClick={cargarUsuarios} disabled={cargando} style={styles.secondaryButton}>
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Correo</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td style={styles.td}>{usuario.nombre || "Sin nombre"}</td>
                  <td style={styles.td}>{usuario.email}</td>
                  <td style={styles.td}>{usuario.role}</td>
                  <td style={styles.td}>{usuario.activo ? "Activo" : "Inactivo"}</td>
                </tr>
              ))}

              {!cargando && usuarios.length === 0 && (
                <tr>
                  <td style={styles.tdEmpty} colSpan="4">No hay usuarios registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const baseButton = {
  border: "none",
  padding: "13px 18px",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #250000 0%, #050505 45%, #000000 100%)",
    color: "white",
    padding: 24,
  },
  card: {
    maxWidth: 980,
    margin: "0 auto",
    background: "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 26,
    boxShadow: "0 0 35px rgba(220, 38, 38, 0.28)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    border: "1px solid #facc15",
    color: "#facc15",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: 900,
    marginBottom: 12,
  },
  title: {
    fontSize: 42,
    margin: "0 0 8px",
    color: "#facc15",
    textShadow: "3px 3px 0 #dc2626, 0 0 16px rgba(250,204,21,0.55)",
  },
  text: {
    color: "#fef3c7",
    lineHeight: 1.5,
    margin: 0,
  },
  backButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #facc15, #ca8a04)",
    color: "#111",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    alignItems: "end",
    marginTop: 24,
  },
  inputGroup: {
    display: "grid",
    gap: 7,
  },
  label: {
    color: "#facc15",
    fontWeight: 900,
  },
  input: {
    padding: "13px 16px",
    borderRadius: 14,
    border: "1px solid #dc2626",
    background: "#090909",
    color: "#facc15",
    fontSize: 16,
    fontWeight: 800,
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
    whiteSpace: "pre-wrap",
  },
  tableCard: {
    maxWidth: 980,
    margin: "28px auto 0",
    background: "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 22,
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  tableWrap: {
    marginTop: 16,
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: 12,
    color: "#facc15",
    borderBottom: "1px solid #7f1d1d",
  },
  td: {
    padding: 12,
    color: "#fef3c7",
    borderBottom: "1px solid #1f2937",
  },
  tdEmpty: {
    padding: 18,
    textAlign: "center",
    color: "#fef3c7",
  },
};
