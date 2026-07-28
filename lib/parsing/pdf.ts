import * as pdfjsLib from "pdfjs-dist";
import { ocrImage, type ChineseVariant } from "./ocr";

let workerConfigured = false;

function configureWorker() {
  if (workerConfigured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  workerConfigured = true;
}

const HAN_CHAR = /\p{Script=Han}/u;

function countHanChars(text: string): number {
  let count = 0;
  for (const ch of text) if (HAN_CHAR.test(ch)) count++;
  return count;
}

async function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  scale = 2.5,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d")!;
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

export interface PdfExtractionOptions {
  chineseVariant?: ChineseVariant;
  onProgress?: (info: { page: number; totalPages: number; ocr: boolean }) => void;
}

/**
 * Extracts text per page. Pages with a usable text layer are read directly;
 * pages with little/no extractable Chinese text (scanned slides) are
 * rasterized and OCR'd instead.
 */
export async function extractPdfText(
  file: File,
  { chineseVariant = "chi_sim", onProgress }: PdfExtractionOptions = {},
): Promise<string[]> {
  configureWorker();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const layerText = textContent.items
      .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
      .join("");

    if (countHanChars(layerText) >= 2) {
      onProgress?.({ page: pageNum, totalPages: doc.numPages, ocr: false });
      pageTexts.push(layerText);
      continue;
    }

    onProgress?.({ page: pageNum, totalPages: doc.numPages, ocr: true });
    const canvas = await renderPageToCanvas(page);
    const ocrText = await ocrImage(canvas, chineseVariant);
    pageTexts.push(ocrText);
  }

  return pageTexts;
}
