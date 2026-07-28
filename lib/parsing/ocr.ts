import { createWorker, type Worker } from "tesseract.js";

export type ChineseVariant = "chi_sim" | "chi_tra";

let workerPromise: Promise<Worker> | null = null;
let workerVariant: ChineseVariant | null = null;

async function getWorker(variant: ChineseVariant): Promise<Worker> {
  if (workerPromise && workerVariant === variant) return workerPromise;

  if (workerPromise) {
    const stale = await workerPromise;
    await stale.terminate();
  }

  workerVariant = variant;
  workerPromise = createWorker([variant, "eng"]);
  return workerPromise;
}

export async function ocrImage(
  image: File | Blob | HTMLCanvasElement,
  variant: ChineseVariant = "chi_sim",
): Promise<string> {
  const worker = await getWorker(variant);
  const {
    data: { text },
  } = await worker.recognize(image);
  return text;
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
    workerVariant = null;
  }
}
