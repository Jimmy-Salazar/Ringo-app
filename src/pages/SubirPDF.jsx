import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import { createWorker } from "tesseract.js";
import "react-image-crop/dist/ReactCrop.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PATTERN = {
  x: 101,
  y: 111,
  width: 338,
  height: 359,
  gapX: 451,
  gapY: 457,
};

const GRID_PATTERN = {
  x: 0,
  y: 2,
  width: 335,
  height: 332,
};

export default function SubirPDF() {
  const [file, setFile] = useState(null);
  const [archivoId, setArchivoId] = useState(null);
  const [codigoInicial, setCodigoInicial] = useState("");
  const [nombreJuego, setNombreJuego] = useState("");
  const [fechaJuego, setFechaJuego] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [pages, setPages] = useState([]);
  const [tablas, setTablas] = useState([]);
  const [todasLasCeldas, setTodasLasCeldas] = useState([]);
  const [matricesOCR, setMatricesOCR] = useState([]);

  const [procesando, setProcesando] = useState(false);
  const [guardandoBD, setGuardandoBD] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const limpiar = () => {
    setArchivoId(null);
    setPages([]);
    setTablas([]);
    setTodasLasCeldas([]);
    setMatricesOCR([]);
    setMensaje("");
    setError("");
  };

  const generarPreview = async (pdfFile) => {
    const buffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const result = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.8 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      result.push({
        pageNumber: i,
        image: canvas.toDataURL("image/png"),
      });
    }

    setPages(result);
    return result;
  };

  const subirPDF = async () => {
    try {
      setProcesando(true);
      setError("");
      setMensaje("");
      setTablas([]);
      setTodasLasCeldas([]);
      setMatricesOCR([]);

      if (!file) {
        setError("Selecciona un archivo PDF.");
        return;
      }

      await generarPreview(file);
      setMensaje("PDF cargado correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar el PDF.");
    } finally {
      setProcesando(false);
    }
  };

  const recortarImagen = async (src, coords) => {
    const img = new Image();
    img.src = src;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = coords.width;
    canvas.height = coords.height;

    ctx.drawImage(
      img,
      coords.x,
      coords.y,
      coords.width,
      coords.height,
      0,
      0,
      coords.width,
      coords.height
    );

    return canvas.toDataURL("image/png");
  };

  const recortarTablas = async () => {
    try {
      setProcesando(true);
      setError("");
      setMensaje("");
      setTablas([]);
      setTodasLasCeldas([]);
      setMatricesOCR([]);

      if (!pages.length) {
        setError("Primero sube el PDF.");
        return;
      }

      const result = [];

      for (const page of pages) {
        let posicion = 1;

        for (let fila = 0; fila < 3; fila++) {
          for (let columna = 0; columna < 2; columna++) {
            const coords = {
              x: PATTERN.x + columna * PATTERN.gapX,
              y: PATTERN.y + fila * PATTERN.gapY,
              width: PATTERN.width,
              height: PATTERN.height,
            };

            const image = await recortarImagen(page.image, coords);

            result.push({
              pagina: page.pageNumber,
              posicion,
              coords,
              image,
            });

            posicion++;
          }
        }
      }

      setTablas(result);
      setMensaje(`Se recortaron ${result.length} tablas.`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al recortar tablas.");
    } finally {
      setProcesando(false);
    }
  };

  const cortarCeldasDeTabla = async (tablaImage) => {
    const img = new Image();
    img.src = tablaImage;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const cellW = GRID_PATTERN.width / 5;
    const cellH = GRID_PATTERN.height / 5;

    const resultado = [];

    for (let fila = 0; fila < 5; fila++) {
      for (let columna = 0; columna < 5; columna++) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = Math.round(cellW);
        canvas.height = Math.round(cellH);

        ctx.drawImage(
          img,
          GRID_PATTERN.x + columna * cellW,
          GRID_PATTERN.y + fila * cellH,
          cellW,
          cellH,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resultado.push({
          fila,
          columna,
          image: canvas.toDataURL("image/png"),
        });
      }
    }

    return resultado;
  };

  const recortarTodasLasTablas = async () => {
    try {
      setProcesando(true);
      setError("");
      setMensaje("");
      setTodasLasCeldas([]);
      setMatricesOCR([]);

      if (!tablas.length) {
        setError("Primero recorta las tablas.");
        return;
      }

      const resultado = [];

      for (const tabla of tablas) {
        const celdasTabla = await cortarCeldasDeTabla(tabla.image);

        resultado.push({
          pagina: tabla.pagina,
          posicion: tabla.posicion,
          tablaImage: tabla.image,
          celdas: celdasTabla,
        });
      }

      setTodasLasCeldas(resultado);
      setMensaje(`Se generaron ${resultado.length} tablas con 25 celdas cada una.`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error recortando celdas.");
    } finally {
      setProcesando(false);
    }
  };

  const prepararCeldaParaOCR = async (imageSrc) => {
    const img = new Image();
    img.src = imageSrc;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const scale = 4;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = gray < 150 ? 0 : 255;

      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const limpiarOCR = (texto) => {
    return texto
      .replace(/[OoQ]/g, "0")
      .replace(/[Il|!]/g, "1")
      .replace(/[Ss]/g, "5")
      .replace(/[Bb]/g, "8")
      .replace(/[Zz]/g, "2")
      .replace(/[^0-9]/g, "");
  };

  const leerNumeroCelda = async (worker, celda) => {
    const imagenProcesada = await prepararCeldaParaOCR(celda.image);
    const { data } = await worker.recognize(imagenProcesada);

    const limpio = limpiarOCR(data.text);
    let valor = limpio ? Number(limpio) : null;

    if (valor !== null && (valor < 1 || valor > 75)) {
      valor = null;
    }

    return {
      fila: celda.fila,
      columna: celda.columna,
      raw: data.text,
      limpio,
      valor,
    };
  };

  const construirMatrizDesdeCeldas = async (worker, tabla) => {
    const detalle = [];
    const matriz = [];

    for (let fila = 0; fila < 5; fila++) {
      const filaMatriz = [];

      for (let columna = 0; columna < 5; columna++) {
        if (fila === 2 && columna === 2) {
          filaMatriz.push("FREE");
          detalle.push({
            fila,
            columna,
            raw: "FREE",
            limpio: "FREE",
            valor: "FREE",
          });
          continue;
        }

        const celda = tabla.celdas.find(
          (c) => c.fila === fila && c.columna === columna
        );

        const resultado = await leerNumeroCelda(worker, celda);

        filaMatriz.push(resultado.valor);
        detalle.push(resultado);
      }

      matriz.push(filaMatriz);
    }

    return { matriz, detalle };
  };

  const leerOCRTodasLasTablas = async () => {
    try {
      setProcesando(true);
      setError("");
      setMensaje("");
      setMatricesOCR([]);

      if (!todasLasCeldas.length) {
        setError("Primero recorta TODAS las tablas en celdas.");
        return;
      }

      if (!codigoInicial) {
        setError("Ingresa el código inicial de la primera tabla. Ejemplo: 5903.");
        return;
      }

      const codigoBase = Number(codigoInicial);

      if (!Number.isInteger(codigoBase)) {
        setError("El código inicial debe ser numérico.");
        return;
      }

      const worker = await createWorker("eng");

      await worker.setParameters({
        tessedit_char_whitelist: "0123456789",
        tessedit_pageseg_mode: "10",
      });

      const matrices = [];

      for (let i = 0; i < todasLasCeldas.length; i++) {
        const tabla = todasLasCeldas[i];
        const { matriz, detalle } = await construirMatrizDesdeCeldas(worker, tabla);

        matrices.push({
          index: i,
          pagina: tabla.pagina,
          posicion: tabla.posicion,
          codigo_tabla: String(codigoBase + i),
          matriz,
          detalle,
        });

        setMensaje(`OCR procesando tabla ${i + 1} de ${todasLasCeldas.length}`);
      }

      await worker.terminate();

      setMatricesOCR(matrices);
      setMensaje("OCR completado. Revisa los códigos y corrige los signos ?.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error leyendo OCR.");
    } finally {
      setProcesando(false);
    }
  };

  const actualizarCodigoTabla = (tablaIndex, valor) => {
    setMatricesOCR((prev) =>
      prev.map((tabla) =>
        tabla.index === tablaIndex
          ? { ...tabla, codigo_tabla: valor.replace(/[^0-9]/g, "") }
          : tabla
      )
    );
  };

  const actualizarMatrizTodas = (tablaIndex, filaIndex, colIndex, valorNuevo) => {
    setMatricesOCR((prev) =>
      prev.map((tabla) => {
        if (tabla.index !== tablaIndex) return tabla;

        const nuevaMatriz = tabla.matriz.map((fila) => [...fila]);

        if (nuevaMatriz[filaIndex][colIndex] === "FREE") return tabla;

        if (valorNuevo === "") {
          nuevaMatriz[filaIndex][colIndex] = null;
        } else {
          const numero = Number(valorNuevo);

          if (!Number.isInteger(numero) || numero < 1 || numero > 75) {
            return tabla;
          }

          nuevaMatriz[filaIndex][colIndex] = numero;
        }

        return {
          ...tabla,
          matriz: nuevaMatriz,
        };
      })
    );
  };

  const validarMatriz = (matriz) => {
    const errores = [];

    matriz.forEach((fila, filaIndex) => {
      fila.forEach((valor, colIndex) => {
        if (valor === "FREE") return;

        if (valor === null || valor === "" || valor === undefined) {
          errores.push(`F${filaIndex + 1} C${colIndex + 1}`);
          return;
        }

        const numero = Number(valor);

        if (!Number.isInteger(numero) || numero < 1 || numero > 75) {
          errores.push(`F${filaIndex + 1} C${colIndex + 1}`);
        }
      });
    });

    return errores;
  };

  const asegurarArchivoEnBD = async () => {
    if (archivoId) return archivoId;

    if (!file) {
      throw new Error("No hay archivo PDF seleccionado.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Debes iniciar sesión para subir tablas.");
    }

    const nombreLimpio = nombreJuego.trim();

    if (!nombreLimpio) {
      throw new Error("Ingresa el nombre del juego. Ejemplo: Papiringo o Ringo Quil.");
    }

    const cleanName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const storagePath = `${user.id}/${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("ringo-pdfs")
      .upload(storagePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data, error: insertError } = await supabase
      .from("ringo_archivos")
      .insert({
        nombre_archivo: file.name,
        storage_path: storagePath,
        estado: "procesando",
        total_paginas: pages.length,
        total_tablas: matricesOCR.length,
        nombre_juego: nombreLimpio,
        fecha_juego: fechaJuego || null,
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    setArchivoId(data.id);
    return data.id;
  };

  const guardarTodasEnBD = async () => {
    try {
      setError("");
      setMensaje("");
      setGuardandoBD(true);

      const nombreLimpio = nombreJuego.trim();

      if (!nombreLimpio) {
        setError("Ingresa el nombre del juego. Ejemplo: Papiringo o Ringo Quil.");
        return;
      }

      if (!fechaJuego) {
        setError("Selecciona la fecha del juego.");
        return;
      }

      if (!matricesOCR.length) {
        setError("Primero ejecuta OCR.");
        return;
      }

      const errores = [];

      matricesOCR.forEach((tabla) => {
        const faltantes = validarMatriz(tabla.matriz);

        if (!tabla.codigo_tabla || String(tabla.codigo_tabla).trim() === "") {
          errores.push(`Tabla ${tabla.index + 1}: falta número real de tabla`);
        }

        if (faltantes.length > 0) {
          errores.push(
            `Tabla ${tabla.index + 1} / Página ${tabla.pagina} Pos ${tabla.posicion}: ${faltantes.join(", ")}`
          );
        }
      });

      if (errores.length > 0) {
        setError(`Corrige esto antes de guardar:\n${errores.join("\n")}`);
        return;
      }

      const idArchivo = await asegurarArchivoEnBD();

      const registros = matricesOCR.map((tabla) => {
        const numeros = tabla.matriz
          .flat()
          .filter((n) => n !== "FREE")
          .map((n) => Number(n));

        return {
          archivo_id: idArchivo,
          numero_tabla: String(tabla.codigo_tabla).trim(),
          codigo_tabla: String(tabla.codigo_tabla).trim(),
          pagina: tabla.pagina,
          posicion_en_pagina: tabla.posicion,
          matriz: tabla.matriz,
          numeros,
          activo: true,
        };
      });

      const { error: upsertError } = await supabase.from("ringo_tablas").upsert(
        registros,
        {
          onConflict: "archivo_id,numero_tabla",
        }
      );

      if (upsertError) throw upsertError;

      await supabase
        .from("ringo_archivos")
        .update({
          estado: "procesado",
          total_paginas: pages.length,
          total_tablas: registros.length,
          nombre_juego: nombreJuego.trim(),
          fecha_juego: fechaJuego || null,
        })
        .eq("id", idArchivo);

      setMensaje("DATOS GUARDADOS");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error guardando tablas en BD.");
    } finally {
      setGuardandoBD(false);
    }
  };

  const renderMatrizEditable = (tabla) => (
    <div style={styles.ocrGrid}>
      {tabla.matriz.flatMap((fila, filaIndex) =>
        fila.map((valor, colIndex) => {
          const celdaImg = todasLasCeldas[tabla.index]?.celdas?.find(
            (c) => c.fila === filaIndex && c.columna === colIndex
          );

          const isFree = valor === "FREE";
          const isEmpty = valor === null;

          return (
            <div key={`${filaIndex}-${colIndex}`} style={styles.compareCell}>
              <div style={styles.cellImageBox}>
                {celdaImg && (
                  <img
                    src={celdaImg.image}
                    alt={`F${filaIndex + 1} C${colIndex + 1}`}
                    style={styles.cellImage}
                  />
                )}
              </div>

              <div
                style={{
                  ...styles.inputBox,
                  background: isFree ? "#14532d" : isEmpty ? "#7f1d1d" : "#020617",
                }}
              >
                {isFree ? (
                  <span style={styles.freeText}>FREE</span>
                ) : (
                  <input
                    value={valor ?? ""}
                    placeholder="?"
                    onChange={(e) =>
                      actualizarMatrizTodas(tabla.index, filaIndex, colIndex, e.target.value)
                    }
                    style={styles.ocrInput}
                  />
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Link to="/" style={styles.backButton}>
            ←
          </Link>

          <div>
            <h1 style={styles.title}>RINGO - Lector de tablas</h1>
            <p style={styles.text}>
              Sube el PDF, asigna nombre de juego, recorta las tablas, ejecuta OCR, agrega el código inicial y guarda.
            </p>
          </div>
        </div>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            limpiar();
            setFile(e.target.files?.[0] || null);
          }}
          style={styles.fileInput}
        />

        <div style={styles.gameFields}>
          <label style={styles.gameLabel}>
            Nombre del juego
            <input
              value={nombreJuego}
              onChange={(e) => setNombreJuego(e.target.value)}
              placeholder="Ej: Papiringo, Ringo Quil"
              style={styles.gameInput}
            />
          </label>

          <label style={styles.gameLabel}>
            Fecha del juego
            <input
              type="date"
              value={fechaJuego}
              onChange={(e) => setFechaJuego(e.target.value)}
              style={styles.gameInput}
            />
          </label>
        </div>

        <input
          value={codigoInicial}
          onChange={(e) => setCodigoInicial(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Código inicial de la primera tabla. Ej: 5903"
          style={styles.codigoInicialInput}
        />

        <div style={styles.actions}>
          <button onClick={subirPDF} disabled={!file || procesando} style={styles.primaryButton}>
            1. Subir PDF
          </button>

          <button
            onClick={recortarTablas}
            disabled={!pages.length || procesando}
            style={styles.successButton}
          >
            2. Recortar tablas
          </button>

          <button
            onClick={recortarTodasLasTablas}
            disabled={!tablas.length || procesando}
            style={styles.warningButton}
          >
            3. Recortar 25 celdas
          </button>

          <button
            onClick={leerOCRTodasLasTablas}
            disabled={!todasLasCeldas.length || procesando}
            style={styles.purpleButton}
          >
            4. Leer OCR
          </button>

          <button
            onClick={guardarTodasEnBD}
            disabled={!matricesOCR.length || guardandoBD}
            style={styles.saveButton}
          >
            5. Guardar en BD
          </button>
        </div>

        {mensaje && <div style={styles.success}>{mensaje}</div>}
        {error && <div style={styles.error}>{error}</div>}
      </div>

      {tablas.length > 0 && (
        <div style={styles.section}>
          <h2>Tablas recortadas</h2>

          <div style={styles.tablasGrid}>
            {tablas.map((tabla, index) => (
              <div key={index} style={styles.tablaCard}>
                <p style={styles.tablaLabel}>
                  Tabla {index + 1} — Página {tabla.pagina} - Posición {tabla.posicion}
                </p>

                <img src={tabla.image} alt={`Tabla ${index + 1}`} style={styles.tablaImage} />
              </div>
            ))}
          </div>
        </div>
      )}

      {todasLasCeldas.length > 0 && !matricesOCR.length && (
        <div style={styles.section}>
          <h2>Tablas recortadas en 25 celdas</h2>

          {todasLasCeldas.map((tabla, index) => (
            <div key={index} style={styles.allTableCard}>
              <h3>
                Tabla {index + 1} — Página {tabla.pagina} - Posición {tabla.posicion}
              </h3>

              <div style={styles.celdasGrid}>
                {tabla.celdas.map((celda, cellIndex) => (
                  <div key={cellIndex} style={styles.celdaBox}>
                    <span style={styles.celdaLabel}>
                      F{celda.fila + 1} C{celda.columna + 1}
                    </span>

                    <img src={celda.image} alt={`Celda ${cellIndex + 1}`} style={styles.celdaImage} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {matricesOCR.length > 0 && (
        <div style={styles.section}>
          <h2>Cotejo visual + OCR editable</h2>

          {matricesOCR.map((tabla) => (
            <div key={tabla.index} style={styles.allTableCard}>
              <h3>
                Tabla {tabla.index + 1} — Página {tabla.pagina} - Posición {tabla.posicion}
              </h3>

              <div style={styles.codigoBox}>
                <label style={styles.codigoLabel}>Número real impreso de la tabla</label>
                <input
                  value={tabla.codigo_tabla || ""}
                  onChange={(e) => actualizarCodigoTabla(tabla.index, e.target.value)}
                  placeholder="Ej: 5903"
                  style={styles.codigoInput}
                />
              </div>

              {renderMatrizEditable(tabla)}
            </div>
          ))}
        </div>
      )}
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
  boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
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
    background: "linear-gradient(145deg, #0a0a0a, #020202)",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 26,
    boxShadow: "0 0 45px rgba(220,38,38,0.25)",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "#090909",
    border: "1px solid #dc2626",
    color: "#facc15",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 900,
  },

  title: {
    fontSize: 38,
    marginBottom: 6,
    color: "#facc15",
    textShadow: "3px 3px 0 #dc2626, 0 0 20px rgba(250,204,21,0.6)",
  },

  text: {
    color: "#fef3c7",
    lineHeight: 1.5,
  },

  fileInput: {
    marginTop: 16,
    padding: 12,
    background: "#090909",
    border: "1px solid #dc2626",
    borderRadius: 12,
    color: "#facc15",
    width: "100%",
  },

  gameFields: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },

  gameLabel: {
    display: "grid",
    gap: 6,
    color: "#facc15",
    fontSize: 13,
    fontWeight: "bold",
  },

  gameInput: {
    padding: "13px 14px",
    background: "#090909",
    border: "1px solid #dc2626",
    borderRadius: 12,
    color: "#facc15",
    width: "100%",
    fontSize: 16,
    fontWeight: "bold",
    boxSizing: "border-box",
  },

  codigoInicialInput: {
    marginTop: 12,
    padding: "13px 14px",
    background: "#090909",
    border: "1px solid #dc2626",
    borderRadius: 12,
    color: "#facc15",
    width: "100%",
    fontSize: 16,
    fontWeight: "bold",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },

  primaryButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
  },

  successButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #facc15, #ca8a04)",
    color: "#111",
  },

  warningButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #fb923c, #c2410c)",
  },

  purpleButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #dc2626, #991b1b)",
  },

  saveButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #16a34a, #065f46)",
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

  section: {
    maxWidth: 1180,
    margin: "36px auto 0",
    background: "linear-gradient(145deg, #0a0a0a, #020202)",
    border: "1px solid #b91c1c",
    borderRadius: 24,
    padding: 22,
  },

  tablasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 18,
  },

  tablaCard: {
    background: "#090909",
    border: "1px solid #dc2626",
    borderRadius: 18,
    padding: 14,
  },

  tablaLabel: {
    color: "#facc15",
    fontSize: 14,
    marginBottom: 8,
  },

  tablaImage: {
    width: "100%",
    background: "white",
    borderRadius: 12,
    display: "block",
  },

  celdasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 10,
    maxWidth: 700,
  },

  celdaBox: {
    background: "white",
    border: "1px solid #dc2626",
    borderRadius: 10,
    padding: 5,
  },

  celdaLabel: {
    display: "block",
    color: "#7f1d1d",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },

  celdaImage: {
    width: "100%",
    display: "block",
  },

  allTableCard: {
    background: "#090909",
    border: "1px solid #dc2626",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },

  codigoBox: {
    marginBottom: 14,
    display: "grid",
    gap: 6,
    maxWidth: 280,
  },

  codigoLabel: {
    color: "#facc15",
    fontSize: 13,
    fontWeight: "bold",
  },

  codigoInput: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #dc2626",
    background: "#090909",
    color: "#facc15",
    fontSize: 18,
    fontWeight: "bold",
  },

  ocrGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(110px, 1fr))",
    gap: 12,
    maxWidth: 760,
  },

  compareCell: {
    background: "#111",
    border: "1px solid #dc2626",
    borderRadius: 14,
    padding: 8,
  },

  cellImageBox: {
    background: "white",
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
  },

  cellImage: {
    width: "100%",
    display: "block",
  },

  inputBox: {
    height: 46,
    borderRadius: 10,
    border: "1px solid #dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  ocrInput: {
    width: "100%",
    height: "100%",
    background: "transparent",
    color: "#facc15",
    border: "none",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    outline: "none",
  },

  freeText: {
    fontWeight: 900,
    color: "#22c55e",
  },
};