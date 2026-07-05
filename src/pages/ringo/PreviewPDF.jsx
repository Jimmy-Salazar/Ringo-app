import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

export default function PreviewPDF() {
  const [images, setImages] = useState([]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();

    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result);

      const pdf = await pdfjsLib.getDocument(typedarray).promise;

      let imgs = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        imgs.push(canvas.toDataURL());
      }

      setImages(imgs);
    };

    fileReader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Preview PDF</h2>

      <input type="file" accept="application/pdf" onChange={handleFile} />

      <div style={{ marginTop: 20 }}>
        {images.map((img, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h4>Página {i + 1}</h4>
            <img src={img} style={{ width: "100%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}