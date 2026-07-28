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

/** Extracts all visible text runs from a .pptx file, one string per slide. */
export async function extractPptxText(file: File): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = Number(a.match(/slide(\d+)\.xml$/)![1]);
      const numB = Number(b.match(/slide(\d+)\.xml$/)![1]);
      return numA - numB;
    });

  const slideTexts: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("text");
    // Join runs within a paragraph (<a:p>) with no separator (they're often split
    // mid-word for formatting), and separate paragraphs with newlines so line-based
    // parsing (e.g. pinyin/translation pairs) can find sentence boundaries.
    const paragraphs = xml.match(/<a:p>[\s\S]*?<\/a:p>/g) ?? [];
    const lines = paragraphs
      .map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1])).join(""))
      .filter((line) => line.trim() !== "");
    slideTexts.push(lines.join("\n"));
  }

  return slideTexts;
}
