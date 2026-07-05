import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const MODOS_JUEGO = [
  "LINEA",
  "ESQUINAS",
  "DIAGONAL",
  "CUADRADO",
  "CRUZ",
  "PRIMERA_COLUMNA",
  "SEGUNDA_COLUMNA",
  "TERCERA_COLUMNA",
  "CUARTA_COLUMNA",
  "QUINTA_COLUMNA",
  "TABLA_LLENA",
];

export default function JugarBingo() {
  const [tablas, setTablas] = useState([]);
  const [bola, setBola] = useState("");
  const [bolasCantadas, setBolasCantadas] = useState([]);
  const [modoJuego, setModoJuego] = useState("LINEA");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [nombreJuego, setNombreJuego] = useState("");
  const [fechaJuego, setFechaJuego] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [archivandoTablas, setArchivandoTablas] = useState(false);
  const [tablasDisponibles, setTablasDisponibles] = useState([]);
  const [juegosDisponibles, setJuegosDisponibles] = useState([]);
  const [juegosSeleccionadosKeys, setJuegosSeleccionadosKeys] = useState([]);
  const [selectorJuegosAbierto, setSelectorJuegosAbierto] = useState(false);
  const [cargandoSelectorJuegos, setCargandoSelectorJuegos] = useState(false);

  const consultarTablasActivas = async () => {
    const { data, error } = await supabase
      .from("ringo_tablas")
      .select(`
        id,
        archivo_id,
        numero_tabla,
        codigo_tabla,
        pagina,
        posicion_en_pagina,
        matriz,
        numeros,
        activo,
        ringo_archivos (
          nombre_archivo,
          nombre_juego,
          fecha_juego
        )
      `)
      .eq("activo", true)
      .order("archivo_id", { ascending: true })
      .order("pagina", { ascending: true })
      .order("posicion_en_pagina", { ascending: true });

    if (error) throw error;

    return data || [];
  };

  const obtenerNombreJuegoTabla = (tabla) => {
    const nombre = tabla.ringo_archivos?.nombre_juego?.trim();
    return nombre || "Sin nombre";
  };

  const obtenerFechaJuegoTabla = (tabla) => {
    return tabla.ringo_archivos?.fecha_juego || "Sin fecha";
  };

  const crearClaveJuego = (tabla) => {
    const nombre = obtenerNombreJuegoTabla(tabla).toUpperCase();
    const fecha = obtenerFechaJuegoTabla(tabla);
    return `${nombre}__${fecha}`;
  };

  const agruparTablasPorJuego = (listaTablas) => {
    const grupos = new Map();

    listaTablas.forEach((tabla) => {
      const key = crearClaveJuego(tabla);
      const nombre = obtenerNombreJuegoTabla(tabla);
      const fecha = obtenerFechaJuegoTabla(tabla);
      const archivoNombre = tabla.ringo_archivos?.nombre_archivo || "Sin archivo";

      if (!grupos.has(key)) {
        grupos.set(key, {
          key,
          nombre_juego: nombre,
          fecha_juego: fecha,
          tablas: [],
          archivos: new Set(),
        });
      }

      const grupo = grupos.get(key);
      grupo.tablas.push(tabla);
      grupo.archivos.add(archivoNombre);
    });

    return Array.from(grupos.values())
      .map((grupo) => ({
        ...grupo,
        total_tablas: grupo.tablas.length,
        archivos: Array.from(grupo.archivos),
      }))
      .sort((a, b) => {
        const porNombre = a.nombre_juego.localeCompare(b.nombre_juego, "es");
        if (porNombre !== 0) return porNombre;
        return String(a.fecha_juego).localeCompare(String(b.fecha_juego));
      });
  };

  const obtenerClavesDeTablas = (listaTablas) => {
    return [...new Set(listaTablas.map((tabla) => crearClaveJuego(tabla)))];
  };

  const sincronizarDatosJuego = (tablasCargadas) => {
    const grupos = agruparTablasPorJuego(tablasCargadas);

    if (grupos.length === 1) {
      const juego = grupos[0];

      if (juego.nombre_juego !== "Sin nombre") {
        setNombreJuego(juego.nombre_juego);
      }

      if (juego.fecha_juego !== "Sin fecha") {
        setFechaJuego(juego.fecha_juego);
      }

      return;
    }

    if (grupos.length > 1) {
      setNombreJuego("Varios juegos seleccionados");
    }
  };

  const cargarTablas = async () => {
    try {
      setError("");
      setMensaje("");

      const tablasCargadas = await consultarTablasActivas();
      const juegos = agruparTablasPorJuego(tablasCargadas);

      setTablasDisponibles(tablasCargadas);
      setJuegosDisponibles(juegos);

      if (tablas.length > 0) {
        const idsActuales = new Set(tablas.map((tabla) => String(tabla.id)));
        const tablasActualizadas = tablasCargadas.filter((tabla) =>
          idsActuales.has(String(tabla.id))
        );

        setTablas(tablasActualizadas);
        setJuegosSeleccionadosKeys(obtenerClavesDeTablas(tablasActualizadas));
        sincronizarDatosJuego(tablasActualizadas);
        setMensaje(`Se actualizaron ${tablasActualizadas.length} tablas de los juegos cargados.`);
      } else {
        setTablas([]);
        setJuegosSeleccionadosKeys([]);
        setMensaje(
          `Hay ${juegos.length} juegos disponibles. Presiona “Recargar / elegir juego” para seleccionar cuál cargar.`
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error cargando juegos.");
    }
  };

  useEffect(() => {
    setTablas([]);
    setJuegosSeleccionadosKeys([]);
    setMensaje(
      "No hay tablas cargadas. Presiona “Recargar / elegir juego” y selecciona uno o varios juegos para iniciar."
    );
  }, []);

  const archivoIdsActivos = useMemo(() => {
    return [...new Set(tablas.map((tabla) => tabla.archivo_id).filter(Boolean))];
  }, [tablas]);

  const tablaIdsCargadas = useMemo(() => {
    return tablas.map((tabla) => tabla.id).filter(Boolean);
  }, [tablas]);

  const hayMultiplesJuegosCargados = useMemo(() => {
    return obtenerClavesDeTablas(tablas).length > 1;
  }, [tablas]);

  const abrirSelectorJuegos = async () => {
    try {
      setSelectorJuegosAbierto(true);
      setCargandoSelectorJuegos(true);
      setError("");
      setMensaje("");

      const tablasCargadas = await consultarTablasActivas();
      const juegos = agruparTablasPorJuego(tablasCargadas);

      setTablasDisponibles(tablasCargadas);
      setJuegosDisponibles(juegos);

      if (tablas.length > 0) {
        setJuegosSeleccionadosKeys(obtenerClavesDeTablas(tablas));
      } else if (juegosSeleccionadosKeys.length > 0) {
        const clavesDisponibles = new Set(juegos.map((juego) => juego.key));
        setJuegosSeleccionadosKeys((prev) =>
          prev.filter((key) => clavesDisponibles.has(key))
        );
      }

      if (juegos.length === 0) {
        setMensaje("No hay juegos activos disponibles para cargar.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error abriendo selector de juegos.");
    } finally {
      setCargandoSelectorJuegos(false);
    }
  };

  const toggleJuegoSeleccionado = (key) => {
    setJuegosSeleccionadosKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }

      return [...prev, key];
    });
  };

  const seleccionarTodosLosJuegos = () => {
    setJuegosSeleccionadosKeys(juegosDisponibles.map((juego) => juego.key));
  };

  const limpiarSeleccionJuegos = () => {
    setJuegosSeleccionadosKeys([]);
  };

  const cargarJuegosSeleccionados = () => {
    if (juegosSeleccionadosKeys.length === 0) {
      setError("Selecciona uno o varios juegos para cargar.");
      return;
    }

    const clavesSeleccionadas = new Set(juegosSeleccionadosKeys);
    const juegos = juegosDisponibles.filter((item) =>
      clavesSeleccionadas.has(item.key)
    );

    if (juegos.length === 0) {
      setError("No se encontraron los juegos seleccionados. Actualiza la lista e intenta nuevamente.");
      return;
    }

    const tablasSeleccionadas = juegos.flatMap((juego) => juego.tablas);

    setTablas(tablasSeleccionadas);
    sincronizarDatosJuego(tablasSeleccionadas);
    setSelectorJuegosAbierto(false);
    setError("");

    const totalTablas = tablasSeleccionadas.length;
    const nombres = juegos.map((juego) => `${juego.nombre_juego} (${juego.fecha_juego})`);

    setMensaje(
      `Se cargaron ${juegos.length} juego(s): ${nombres.join(", ")} • ${totalTablas} tablas.`
    );
  };

  const cantarBola = () => {
    const numero = Number(bola);

    if (!Number.isInteger(numero) || numero < 1 || numero > 75) {
      setError("Ingresa un número válido entre 1 y 75.");
      return;
    }

    if (bolasCantadas.includes(numero)) {
      setError(`La bola ${numero} ya fue cantada.`);
      return;
    }

    setError("");
    setBolasCantadas((prev) => [numero, ...prev]);
    setBola("");
  };

  const limpiarJuego = () => {
    setBolasCantadas([]);
    setMensaje("Juego reiniciado.");
    setError("");
  };

  const eliminarBolaCantada = (numero) => {
    const confirmar = window.confirm(`¿DESEA BORRAR ESTA BOLA?\n\nBola: ${numero}`);

    if (!confirmar) return;

    setBolasCantadas((prev) => prev.filter((n) => n !== numero));
    setError("");
    setMensaje(`Bola ${numero} eliminada.`);
  };

  const eliminarUltimaBolaCantada = () => {
    if (bolasCantadas.length === 0) {
      setError("No hay bolas cantadas para eliminar.");
      return;
    }

    const ultimaBolaCantada = bolasCantadas[0];
    eliminarBolaCantada(ultimaBolaCantada);
  };

  const guardarNombreJuego = async () => {
    const nombreLimpio = nombreJuego.trim();

    if (!nombreLimpio) {
      setError("Ingresa el nombre del juego. Ejemplo: Papiringo o Ringo Quil.");
      return;
    }

    if (archivoIdsActivos.length === 0) {
      setError("No hay archivos activos para actualizar.");
      return;
    }

    if (hayMultiplesJuegosCargados) {
      setError("Para cambiar el nombre, carga un solo juego. Si cargas varios, no se renombrarán juntos para evitar mezclarlos.");
      return;
    }

    try {
      setGuardandoNombre(true);
      setError("");
      setMensaje("");

      const { error } = await supabase
        .from("ringo_archivos")
        .update({
          nombre_juego: nombreLimpio,
          fecha_juego: fechaJuego || null,
        })
        .in("id", archivoIdsActivos);

      if (error) throw error;

      const actualizarDatosArchivo = (tabla) => ({
        ...tabla,
        ringo_archivos: {
          ...(tabla.ringo_archivos || {}),
          nombre_juego: nombreLimpio,
          fecha_juego: fechaJuego || null,
        },
      });

      setTablas((prev) => prev.map(actualizarDatosArchivo));
      setTablasDisponibles((prev) => prev.map(actualizarDatosArchivo));
      setMensaje(`Nombre guardado: ${nombreLimpio}.`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error guardando el nombre del juego.");
    } finally {
      setGuardandoNombre(false);
    }
  };

  const archivarTablas = async () => {
    const nombreLimpio = nombreJuego.trim();

    if (tablas.length === 0 || tablaIdsCargadas.length === 0) {
      setError("No hay tablas cargadas para archivar.");
      return;
    }

    if (!nombreLimpio && !hayMultiplesJuegosCargados) {
      setError(
        "Antes de archivar, ingresa el nombre del juego. Ejemplo: Papiringo o Ringo Quil."
      );
      return;
    }

    const descripcionArchivo = hayMultiplesJuegosCargados
      ? "varios juegos seleccionados"
      : nombreLimpio;

    const confirmar = window.confirm(
      `¿Archivar ${tablas.length} tablas cargadas de ${descripcionArchivo}?

Luego ya no aparecerán en el juego actual, pero quedarán guardadas en la base de datos.`
    );

    if (!confirmar) return;

    try {
      setArchivandoTablas(true);
      setError("");
      setMensaje("");

      const ahora = new Date().toISOString();

      const datosArchivo = {
        estado: "archivado",
        activo: false,
        archivado_at: ahora,
      };

      if (!hayMultiplesJuegosCargados) {
        datosArchivo.nombre_juego = nombreLimpio;
        datosArchivo.fecha_juego = fechaJuego || null;
      }

      const { error: errorArchivos } = await supabase
        .from("ringo_archivos")
        .update(datosArchivo)
        .in("id", archivoIdsActivos);

      if (errorArchivos) throw errorArchivos;

      const { error: errorTablas } = await supabase
        .from("ringo_tablas")
        .update({
          activo: false,
          archivado_at: ahora,
        })
        .in("id", tablaIdsCargadas);

      if (errorTablas) throw errorTablas;

      setBolasCantadas([]);
      setTablas([]);
      setMensaje(
        `Tablas archivadas para ${descripcionArchivo}. Ahora puedes subir otro PDF o cargar otro juego.`
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Error archivando tablas.");
    } finally {
      setArchivandoTablas(false);
    }
  };

  const bolasSet = useMemo(() => new Set(bolasCantadas), [bolasCantadas]);

  const celdaMarcada = (valor) => {
    if (valor === "FREE") return true;
    return bolasSet.has(Number(valor));
  };

  const obtenerResultadoModo = (matriz, modo) => {
    if (!Array.isArray(matriz) || matriz.length < 5) return null;

    const indices = [0, 1, 2, 3, 4];
    const esCentro = (filaIndex, colIndex) => filaIndex === 2 && colIndex === 2;

    const celdaMarcadaPorPosicion = (
      filaIndex,
      colIndex,
      opciones = { centroValido: true }
    ) => {
      if (!opciones.centroValido && esCentro(filaIndex, colIndex)) {
        return false;
      }

      return celdaMarcada(matriz[filaIndex]?.[colIndex]);
    };

    const filaCompleta = (filaIndex, opciones) =>
      indices.every((colIndex) =>
        celdaMarcadaPorPosicion(filaIndex, colIndex, opciones)
      );

    const columnaCompleta = (colIndex, opciones) =>
      indices.every((filaIndex) =>
        celdaMarcadaPorPosicion(filaIndex, colIndex, opciones)
      );

    if (modo === "LINEA") {
      // En LINEA, la celda central no es válida.
      // Por eso una línea que depende del centro no se marca como ganadora.
      const opcionesLinea = { centroValido: false };
      const hayLinea =
        indices.some((filaIndex) => filaCompleta(filaIndex, opcionesLinea)) ||
        indices.some((colIndex) => columnaCompleta(colIndex, opcionesLinea));

      return hayLinea ? "LÍNEA" : null;
    }

    if (modo === "ESQUINAS") {
      const ok =
        celdaMarcadaPorPosicion(0, 0) &&
        celdaMarcadaPorPosicion(0, 4) &&
        celdaMarcadaPorPosicion(4, 0) &&
        celdaMarcadaPorPosicion(4, 4);

      return ok ? "ESQUINAS" : null;
    }

    if (modo === "DIAGONAL") {
      const diagonal1 = indices.every((i) => celdaMarcadaPorPosicion(i, i));
      const diagonal2 = indices.every((i) => celdaMarcadaPorPosicion(i, 4 - i));

      return diagonal1 || diagonal2 ? "DIAGONAL" : null;
    }

    if (modo === "CUADRADO") {
      const ok =
        filaCompleta(0) &&
        filaCompleta(4) &&
        columnaCompleta(0) &&
        columnaCompleta(4);

      return ok ? "CUADRADO" : null;
    }

    if (modo === "CRUZ") {
      const cruz = filaCompleta(2) && columnaCompleta(2);
      return cruz ? "CRUZ" : null;
    }

    if (modo === "PRIMERA_COLUMNA") {
      return columnaCompleta(0) ? "PRIMERA COLUMNA" : null;
    }

    if (modo === "SEGUNDA_COLUMNA") {
      return columnaCompleta(1) ? "SEGUNDA COLUMNA" : null;
    }

    if (modo === "TERCERA_COLUMNA") {
      return columnaCompleta(2) ? "TERCERA COLUMNA" : null;
    }

    if (modo === "CUARTA_COLUMNA") {
      return columnaCompleta(3) ? "CUARTA COLUMNA" : null;
    }

    if (modo === "QUINTA_COLUMNA") {
      return columnaCompleta(4) ? "QUINTA COLUMNA" : null;
    }

    if (modo === "TABLA_LLENA") {
      const llena = matriz.flat().every(celdaMarcada);
      return llena ? "TABLA LLENA" : null;
    }

    return null;
  };

  const analizarTabla = (matriz) => {
    if (!matriz) return [];

    const resultados = [];
    const resultadoPrincipal = obtenerResultadoModo(matriz, modoJuego);

    if (resultadoPrincipal) {
      resultados.push(resultadoPrincipal);
    }

    // Avisos cruzados: aunque se esté jugando otra modalidad,
    // el sistema también avisa si aparece CRUZ o CUADRADO.
    ["CRUZ", "CUADRADO"].forEach((modoExtra) => {
      if (modoExtra === modoJuego) return;

      const resultadoExtra = obtenerResultadoModo(matriz, modoExtra);

      if (resultadoExtra) {
        resultados.push(`AVISO: ${resultadoExtra}`);
      }
    });

    return resultados;
  };

  const calcularProgresoTabla = (matriz) => {
    if (!Array.isArray(matriz)) {
      return {
        marcadas: 0,
        faltantes: 0,
        totalNumeros: 0,
      };
    }

    const numerosReales = matriz
      .flat()
      .filter((valor) => {
        const texto = String(valor ?? "").trim().toUpperCase();
        return texto !== "" && texto !== "FREE";
      });

    const marcadas = numerosReales.filter(celdaMarcada).length;
    const totalNumeros = numerosReales.length;
    const faltantes = Math.max(totalNumeros - marcadas, 0);

    return {
      marcadas,
      faltantes,
      totalNumeros,
    };
  };

  const tablasOrdenadas = useMemo(() => {
    return tablas
      .map((tabla, index) => {
        const progreso = calcularProgresoTabla(tabla.matriz);

        return {
          ...tabla,
          ordenOriginal: index,
          progreso,
          resultados: analizarTabla(tabla.matriz),
        };
      })
      .sort((a, b) => {
        if (b.progreso.marcadas !== a.progreso.marcadas) {
          return b.progreso.marcadas - a.progreso.marcadas;
        }

        if (a.progreso.faltantes !== b.progreso.faltantes) {
          return a.progreso.faltantes - b.progreso.faltantes;
        }

        return a.ordenOriginal - b.ordenOriginal;
      });
  }, [tablas, bolasCantadas, modoJuego]);

  const ganadoras = tablasOrdenadas.filter(
    (tabla) => tabla.resultados.length > 0
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.backButton}>
          ← Volver al Home
        </Link>

        <h1 style={styles.title}>Jugar Ringo</h1>

        <p style={styles.text}>
          Ingresa las bolas cantadas. El sistema marcará automáticamente las
          tablas, revisará el modo seleccionado y también avisará si aparece
          CRUZ o CUADRADO.
        </p>

        <div style={styles.gameBox}>
          <div style={styles.gameGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.modeLabel}>Nombre del juego</label>
              <input
                value={nombreJuego}
                onChange={(e) => setNombreJuego(e.target.value)}
                placeholder="Ej: Papiringo, Ringo Quil"
                style={styles.gameInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.modeLabel}>Fecha del juego</label>
              <input
                type="date"
                value={fechaJuego}
                onChange={(e) => setFechaJuego(e.target.value)}
                style={styles.gameInput}
              />
            </div>
          </div>

          <div style={styles.gameActions}>
            <button
              onClick={guardarNombreJuego}
              disabled={guardandoNombre || tablas.length === 0 || hayMultiplesJuegosCargados}
              style={{
                ...styles.secondaryButton,
                opacity: guardandoNombre || tablas.length === 0 || hayMultiplesJuegosCargados ? 0.55 : 1,
              }}
            >
              {guardandoNombre ? "Guardando..." : "Guardar nombre"}
            </button>

            <button
              onClick={archivarTablas}
              disabled={archivandoTablas || tablas.length === 0}
              style={{
                ...styles.archiveButton,
                opacity: archivandoTablas || tablas.length === 0 ? 0.55 : 1,
              }}
            >
              {archivandoTablas ? "Archivando..." : "Archivar tablas"}
            </button>
          </div>

          <p style={styles.helperText}>
            Puedes repetir el mismo nombre en fechas diferentes. Ejemplo: Ringo
            Quil hoy y Ringo Quil dentro de dos semanas. Si cargas varios juegos
            al mismo tiempo, el botón “Guardar nombre” se bloquea para no mezclar
            sus nombres por accidente.
          </p>
        </div>

        <div style={styles.modeBox}>
          <label style={styles.modeLabel}>Modo de juego</label>

          <select
            value={modoJuego}
            onChange={(e) => setModoJuego(e.target.value)}
            style={styles.selectModo}
          >
            {MODOS_JUEGO.map((modo) => (
              <option key={modo} value={modo}>
                {modo.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controls}>
          <input
            value={bola}
            onChange={(e) => setBola(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") cantarBola();
            }}
            placeholder="Número 1-75"
            style={styles.input}
          />

          <button onClick={cantarBola} style={styles.primaryButton}>
            Cantar bola
          </button>

          <button
            onClick={eliminarUltimaBolaCantada}
            disabled={bolasCantadas.length === 0}
            style={{
              ...styles.warningButton,
              opacity: bolasCantadas.length === 0 ? 0.55 : 1,
            }}
          >
            Borrar última bola
          </button>

          <button onClick={limpiarJuego} style={styles.dangerButton}>
            Reiniciar juego
          </button>

          <button onClick={abrirSelectorJuegos} style={styles.secondaryButton}>
            Recargar / elegir juego
          </button>
        </div>

        {selectorJuegosAbierto && (
          <div style={styles.selectorBox}>
            <div style={styles.selectorHeader}>
              <div>
                <h2 style={styles.selectorTitle}>Elegir juegos para cargar</h2>
                <p style={styles.helperText}>
                  Selecciona uno o varios juegos. Se cargarán todas las tablas
                  asociadas a esos nombres y fechas. No se borra nada de Supabase.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectorJuegosAbierto(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={styles.selectorActions}>
              <button
                type="button"
                onClick={abrirSelectorJuegos}
                disabled={cargandoSelectorJuegos}
                style={{
                  ...styles.smallButtonDark,
                  opacity: cargandoSelectorJuegos ? 0.55 : 1,
                }}
              >
                {cargandoSelectorJuegos ? "Actualizando..." : "Actualizar lista"}
              </button>

              <button
                type="button"
                onClick={seleccionarTodosLosJuegos}
                disabled={juegosDisponibles.length === 0}
                style={{
                  ...styles.smallButton,
                  opacity: juegosDisponibles.length === 0 ? 0.55 : 1,
                }}
              >
                Seleccionar todos
              </button>

              <button
                type="button"
                onClick={limpiarSeleccionJuegos}
                disabled={juegosSeleccionadosKeys.length === 0}
                style={{
                  ...styles.smallButtonDark,
                  opacity: juegosSeleccionadosKeys.length === 0 ? 0.55 : 1,
                }}
              >
                Limpiar selección
              </button>
            </div>

            <div style={styles.selectorCounter}>
              Juegos disponibles: {juegosDisponibles.length} • Juegos seleccionados: {juegosSeleccionadosKeys.length}
              {juegosSeleccionadosKeys.length > 0
                ? ` • Tablas seleccionadas: ${juegosDisponibles
                    .filter((juego) => juegosSeleccionadosKeys.includes(juego.key))
                    .reduce((total, juego) => total + juego.total_tablas, 0)}`
                : ""}
            </div>

            <div style={styles.selectorList}>
              {juegosDisponibles.map((juego) => {
                const checked = juegosSeleccionadosKeys.includes(juego.key);

                return (
                  <label
                    key={juego.key}
                    style={{
                      ...styles.selectorItem,
                      border: checked
                        ? "2px solid #facc15"
                        : styles.selectorItem.border,
                      background: checked ? "rgba(250, 204, 21, 0.12)" : "#020617",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleJuegoSeleccionado(juego.key)}
                      style={styles.selectorCheckbox}
                    />

                    <div style={styles.selectorInfo}>
                      <strong>{juego.nombre_juego}</strong>
                      <span>
                        Fecha: {juego.fecha_juego} • Tablas: {juego.total_tablas}
                      </span>
                      <span>
                        Archivos: {juego.archivos.join(", ")}
                      </span>
                    </div>
                  </label>
                );
              })}

              {!cargandoSelectorJuegos && juegosDisponibles.length === 0 && (
                <div style={styles.emptySelector}>No hay juegos activos disponibles.</div>
              )}
            </div>

            <div style={styles.selectorFooter}>
              <button
                type="button"
                onClick={cargarJuegosSeleccionados}
                disabled={juegosSeleccionadosKeys.length === 0}
                style={{
                  ...styles.primaryButton,
                  opacity: juegosSeleccionadosKeys.length === 0 ? 0.55 : 1,
                }}
              >
                Cargar juegos seleccionados
              </button>
            </div>
          </div>
        )}

        {mensaje && <div style={styles.success}>{mensaje}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.bolasBox}>
          <h2>Bolas cantadas</h2>
          <p style={styles.helperText}>
            Para corregir una bola mal digitada, presiona la bola que quieres borrar
            o usa “Borrar última bola”.
          </p>

          <div style={styles.bolasList}>
            {bolasCantadas.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => eliminarBolaCantada(n)}
                title={`Eliminar bola ${n}`}
                style={styles.bolaItem}
              >
                <span>{n}</span>
                <span style={styles.bolaDelete}>×</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {ganadoras.length > 0 && (
        <div style={styles.sectionWinner}>
          <h2>Posibles ganadoras - {modoJuego.replaceAll("_", " ")}</h2>

          {ganadoras.map((tabla) => (
            <div key={tabla.id} style={styles.winnerCard}>
              <strong>{tabla.resultados.join(" + ")}</strong>
              <p>
                Juego: {tabla.ringo_archivos?.nombre_juego || nombreJuego || "Sin nombre"}
                {tabla.ringo_archivos?.fecha_juego
                  ? ` | Fecha: ${tabla.ringo_archivos.fecha_juego}`
                  : ""}
              </p>
              <p>
                Tabla: {tabla.codigo_tabla || tabla.numero_tabla} | Archivo:{" "}
                {tabla.ringo_archivos?.nombre_archivo || "Sin archivo"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={styles.section}>
        <h2>Tablas cargadas en juego ({tablas.length})</h2>
        <p style={styles.helperText}>
          Las tablas cargadas se ordenan automáticamente: primero aparecen las que
          tienen más bolas cantadas marcadas. En LINEA, la celda central no cuenta
          para completar línea; para las demás modalidades sí se mantiene válida.
        </p>

        {tablas.length === 0 && (
          <div style={styles.emptyGameState}>
            No hay tablas cargadas para jugar. Presiona “Recargar / elegir juego”,
            selecciona uno o varios juegos y luego pulsa “Cargar juegos seleccionados”.
          </div>
        )}

        <div style={styles.grid}>
          {tablasOrdenadas.map((tabla, index) => {
            const resultados = tabla.resultados;
            const esGanadora = resultados.length > 0;
            const progreso = tabla.progreso;

            return (
              <div
                key={tabla.id}
                style={{
                  ...styles.tablaCard,
                  border: esGanadora
                    ? "3px solid #22c55e"
                    : "1px solid #334155",
                }}
              >
                <div style={styles.tablaHeader}>
                  <strong>{tabla.codigo_tabla || tabla.numero_tabla}</strong>
                  <span style={styles.progresoBadge}>
                    #{index + 1} • Marcadas {progreso.marcadas}/
                    {progreso.totalNumeros || 24} • Faltan {progreso.faltantes}
                  </span>
                  <span>
                    Juego: {tabla.ringo_archivos?.nombre_juego || nombreJuego || "Sin nombre"}
                    {tabla.ringo_archivos?.fecha_juego
                      ? ` | ${tabla.ringo_archivos.fecha_juego}`
                      : ""}
                  </span>
                  <span>
                    {tabla.ringo_archivos?.nombre_archivo || "Sin archivo"}
                  </span>
                </div>

                {esGanadora && (
                  <div style={styles.badge}>{resultados.join(" + ")}</div>
                )}

                <div style={styles.matriz}>
                  {tabla.matriz.flatMap((fila, filaIndex) =>
                    fila.map((valor, colIndex) => {
                      const marcado = celdaMarcada(valor);

                      return (
                        <div
                          key={`${filaIndex}-${colIndex}`}
                          style={{
                            ...styles.celda,
                            background: marcado ? "#16a34a" : "#020617",
                            color: marcado ? "white" : "#cbd5e1",
                          }}
                        >
                          {valor}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const baseButton = {
  border: "none",
  padding: "13px 18px",
  borderRadius: 14,
  fontWeight: "800",
  color: "white",
  cursor: "pointer",
};

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #250000 0%, #050505 45%, #000000 100%)",
    color: "white",
    padding: 20,
  },
  card: {
    maxWidth: 980,
    margin: "0 auto",
    background:
      "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 26,
    boxShadow: "0 0 35px rgba(220, 38, 38, 0.28)",
  },
  backButton: {
    display: "inline-block",
    marginBottom: 16,
    color: "#facc15",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    fontSize: 42,
    marginBottom: 8,
    color: "#facc15",
    textShadow: "3px 3px 0 #dc2626, 0 0 16px rgba(250,204,21,0.55)",
    letterSpacing: 1,
  },
  text: {
    color: "#fef3c7",
    lineHeight: 1.5,
  },
  gameBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    border: "1px solid #7f1d1d",
    background: "rgba(15, 15, 15, 0.9)",
  },
  gameGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  inputGroup: {
    display: "grid",
    gap: 8,
  },
  gameInput: {
    padding: "13px 16px",
    borderRadius: 14,
    border: "1px solid #dc2626",
    background: "#090909",
    color: "#facc15",
    fontSize: 16,
    fontWeight: "bold",
  },
  gameActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  helperText: {
    margin: "12px 0 0",
    color: "#fed7aa",
    fontSize: 13,
    lineHeight: 1.4,
  },
  modeBox: {
    marginTop: 18,
    display: "grid",
    gap: 8,
    maxWidth: 320,
  },
  modeLabel: {
    color: "#facc15",
    fontWeight: "bold",
    fontSize: 14,
  },
  selectModo: {
    padding: "13px 16px",
    borderRadius: 14,
    border: "1px solid #dc2626",
    background: "#090909",
    color: "#facc15",
    fontSize: 16,
    fontWeight: "bold",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
  },
  selectorBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(250, 204, 21, 0.45)",
    background: "rgba(15, 15, 15, 0.95)",
  },
  selectorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  selectorTitle: {
    margin: 0,
    color: "#facc15",
    fontSize: 22,
  },
  closeButton: {
    border: "1px solid #7f1d1d",
    background: "#090909",
    color: "#fecaca",
    borderRadius: 12,
    width: 38,
    height: 38,
    cursor: "pointer",
    fontSize: 24,
    fontWeight: 900,
    lineHeight: 1,
  },
  selectorActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  smallButton: {
    ...baseButton,
    padding: "10px 13px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #facc15, #ca8a04)",
    color: "#111",
    fontSize: 13,
  },
  smallButtonDark: {
    ...baseButton,
    padding: "10px 13px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #334155, #0f172a)",
    fontSize: 13,
  },
  selectorCounter: {
    marginTop: 12,
    color: "#fef3c7",
    fontSize: 13,
    fontWeight: 800,
  },
  selectorList: {
    display: "grid",
    gap: 8,
    maxHeight: 360,
    overflowY: "auto",
    marginTop: 12,
    paddingRight: 4,
  },
  selectorItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    cursor: "pointer",
  },
  selectorCheckbox: {
    width: 20,
    height: 20,
    marginTop: 2,
    accentColor: "#facc15",
  },
  selectorInfo: {
    display: "grid",
    gap: 3,
    color: "#fef3c7",
    fontSize: 13,
  },
  emptySelector: {
    padding: 14,
    borderRadius: 14,
    border: "1px dashed #7f1d1d",
    color: "#fed7aa",
    textAlign: "center",
  },
  selectorFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  input: {
    padding: "13px 16px",
    borderRadius: 14,
    border: "1px solid #dc2626",
    background: "#090909",
    color: "#facc15",
    fontSize: 18,
    width: 160,
    fontWeight: "bold",
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
  warningButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #fb923c, #9a3412)",
    color: "#111",
  },
  dangerButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #ef4444, #991b1b)",
  },
  archiveButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #64748b, #1e293b)",
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
  bolasBox: {
    marginTop: 24,
  },
  bolasList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  bolaItem: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    border: "none",
    padding: 0,
    position: "relative",
    background:
      "radial-gradient(circle at 30% 25%, #fff7ad, #facc15 45%, #b45309)",
    color: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(250,204,21,0.55)",
  },
  bolaDelete: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#dc2626",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
    border: "1px solid #fecaca",
  },
  section: {
    maxWidth: 1180,
    margin: "36px auto 0",
    background:
      "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(5,5,5,0.98))",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 0 28px rgba(220,38,38,0.18)",
  },
  sectionWinner: {
    maxWidth: 1180,
    margin: "36px auto 0",
    background: "linear-gradient(135deg, #7f1d1d, #111)",
    border: "2px solid #facc15",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 0 32px rgba(250,204,21,0.35)",
  },
  winnerCard: {
    background: "#090909",
    border: "1px solid #facc15",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    color: "#fef3c7",
  },
  emptyGameState: {
    marginTop: 14,
    marginBottom: 14,
    padding: 18,
    borderRadius: 16,
    border: "1px dashed #facc15",
    background: "rgba(250, 204, 21, 0.08)",
    color: "#fef3c7",
    fontWeight: 800,
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18,
  },
  tablaCard: {
    background: "#090909",
    borderRadius: 18,
    padding: 14,
  },
  tablaHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    color: "#fef3c7",
    fontSize: 13,
    marginBottom: 10,
  },
  progresoBadge: {
    display: "inline-flex",
    width: "fit-content",
    background: "rgba(250, 204, 21, 0.12)",
    color: "#facc15",
    border: "1px solid rgba(250, 204, 21, 0.45)",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 900,
  },
  badge: {
    background: "linear-gradient(135deg, #facc15, #ca8a04)",
    color: "#111",
    padding: "8px 10px",
    borderRadius: 10,
    fontWeight: 900,
    marginBottom: 10,
    textAlign: "center",
  },
  matriz: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 6,
  },
  celda: {
    height: 42,
    border: "1px solid #7f1d1d",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  },
};
