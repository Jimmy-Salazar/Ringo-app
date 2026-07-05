import { useState } from "react";
import { supabase } from "../../supabaseClient";
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
          matriz,
          detalle,
        });

        setMensaje(`OCR procesando tabla ${i + 1} de ${todasLasCeldas.length}`);
      }

      await worker.terminate();

      setMatricesOCR(matrices);
      setMensaje("OCR completado. Revisa y corrige los signos ?.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error leyendo OCR.");
    } finally {
      setProcesando(false);
    }
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

    const cleanName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const storagePath = `${Date.now()}_${cleanName}`;

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

      if (!matricesOCR.length) {
        setError("Primero ejecuta OCR.");
        return;
      }

      const errores = [];

      matricesOCR.forEach((tabla) => {
        const faltantes = validarMatriz(tabla.matriz);

        if (faltantes.length > 0) {
          errores.push(
            `Tabla ${tabla.index + 1} / Página ${tabla.pagina} Pos ${tabla.posicion}: ${faltantes.join(", ")}`
          );
        }
      });

      if (errores.length > 0) {
        setError(`Corrige estas celdas antes de guardar:\n${errores.join("\n")}`);
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
          numero_tabla: `P${tabla.pagina}-POS${tabla.posicion}`,
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

  const flujoCompleto = async () => {
    await recortarTablas();
    setTimeout(async () => {
      const result = [];

      for (const tabla of tablas) {
        const celdasTabla = await cortarCeldasDeTabla(tabla.image);
        result.push({
          pagina: tabla.pagina,
          posicion: tabla.posicion,
          tablaImage: tabla.image,
          celdas: celdasTabla,
        });
      }

      setTodasLasCeldas(result);
    }, 200);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div>
          <h1 style={styles.title}>RINGO - Lector de tablas</h1>
          <p style={styles.text}>
            Sube el PDF, recorta las tablas, ejecuta OCR, corrige los signos ? y guarda.
          </p>
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
    background: "radial-gradient(circle at top, #172554 0, #020617 38%, #020617 100%)",
    color: "white",
    padding: 20,
  },
  card: {
    maxWidth: 980,
    margin: "0 auto",
    background: "rgba(15, 23, 42, 0.94)",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 26,
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  },
  title: {
    fontSize: 30,
    marginBottom: 8,
  },
  text: {
    color: "#94a3b8",
    lineHeight: 1.5,
  },
  fileInput: {
    marginTop: 16,
    padding: 12,
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 12,
    color: "white",
    width: "100%",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },
  primaryButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  },
  successButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #16a34a, #15803d)",
  },
  warningButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
  },
  purpleButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
  },
  saveButton: {
    ...baseButton,
    background: "linear-gradient(135deg, #22c55e, #0f766e)",
  },
  success: {
    marginTop: 16,
    background: "#064e3b",
    color: "#a7f3d0",
    padding: 14,
    borderRadius: 14,
    whiteSpace: "pre-wrap",
    fontWeight: 700,
  },
  error: {
    marginTop: 16,
    background: "#7f1d1d",
    color: "#fecaca",
    padding: 14,
    borderRadius: 14,
    whiteSpace: "pre-wrap",
    fontWeight: 700,
  },
  section: {
    maxWidth: 1180,
    margin: "36px auto 0",
    background: "rgba(15, 23, 42, 0.94)",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 22,
  },
  tablasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 18,
  },
  tablaCard: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 14,
  },
  tablaLabel: {
    color: "#cbd5e1",
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
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: 5,
  },
  celdaLabel: {
    display: "block",
    color: "#475569",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },
  celdaImage: {
    width: "100%",
    display: "block",
  },
  allTableCard: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  ocrGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(110px, 1fr))",
    gap: 12,
    maxWidth: 760,
  },
  compareCell: {
    background: "#0f172a",
    border: "1px solid #334155",
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
    border: "1px solid #475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ocrInput: {
    width: "100%",
    height: "100%",
    background: "transparent",
    color: "white",
    border: "none",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    outline: "none",
  },
  freeText: {
    fontWeight: 900,
    color: "#bbf7d0",
  },
};