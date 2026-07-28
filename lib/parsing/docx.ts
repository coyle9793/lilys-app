import JSZip from "jszip";

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeXmlEntities(text: string): string {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&apos;/g, (entity) => XML_ENTITIES[entity]);
}

/**
 * Extracts text from a .docx file as a list of non-empty paragraph lines,
 * preserving paragraph breaks (needed for line-based parsing, e.g. the
 * pinyin/translation pairing logic).
 */
export async function extractDocxText(file: File): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);
  const documentFile = zip.files["word/document.xml"];
  if (!documentFile) {
    throw new Error("This doesn't look like a valid .docx file.");
  }

  const xml = await documentFile.async("text");

  // Word paragraphs/runs almost always carry attributes (revision IDs, etc.),
  // e.g. <w:p w:rsidR="00abc123">, so match tags loosely rather than exact.
  const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];

  const lines = paragraphs
    .map((p) =>
      [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
        .map((m) => decodeXmlEntities(m[1]))
        .join(""),
    )
    .filter((line) => line.trim() !== "");

  return lines;
}
