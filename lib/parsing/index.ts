import { extractPptxText } from "./pptx";
import { extractDocxText } from "./docx";
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

  if (name.endsWith(".docx")) {
    return { sections: await extractDocxText(file) };
  }

  if (name.endsWith(".pdf")) {
    return { sections: await extractPdfText(file, options) };
  }

  if (file.type.startsWith("image/")) {
    options.onProgress?.({ page: 1, totalPages: 1, ocr: true });
    const text = await ocrImage(file, options.chineseVariant);
    return { sections: [text] };
  }

  if (name.endsWith(".doc")) {
    throw new Error(
      `"${file.name}" is an old-style .doc file, which isn't supported — open it in Word ` +
        "and save/export it as .docx (or PDF), then upload that instead.",
    );
  }

  throw new Error(
    `Unsupported file type: "${file.name}". Please upload a .pptx, .docx, .pdf, or image file.`,
  );
}
