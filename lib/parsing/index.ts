import { extractPptxText } from "./pptx";
import { extractPdfText, type PdfExtractionOptions } from "./pdf";
import { ocrImage, type ChineseVariant } from "./ocr";

export type { ChineseVariant };

export interface ExtractionResult {
  /** Raw text pulled from the file, one entry per slide/page (or one entry for a single image). */
  sections: string[];
}

export async function extractTextFromFile(
  file: File,
  options: { chineseVariant?: ChineseVariant; onProgress?: PdfExtractionOptions["onProgress"] } = {},
): Promise<ExtractionResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pptx")) {
    return { sections: await extractPptxText(file) };
  }

  if (name.endsWith(".pdf")) {
    return { sections: await extractPdfText(file, options) };
  }

  if (file.type.startsWith("image/")) {
    options.onProgress?.({ page: 1, totalPages: 1, ocr: true });
    const text = await ocrImage(file, options.chineseVariant);
    return { sections: [text] };
  }

  throw new Error(
    `Unsupported file type: "${file.name}". Please upload a .pptx, .pdf, or image file.`,
  );
}
