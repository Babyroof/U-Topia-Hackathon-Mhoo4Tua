/**
 * Quick photo-quality checks in the browser (no library): blur, resolution and lighting.
 * They only warn; the user can still upload, since thresholds can't fit every camera.
 */

/** Measured on a copy scaled so its long side is this many pixels, so scores compare across cameras. */
const ANALYSIS_SIZE = 800;
const MIN_LONG_SIDE = 1000;
const BLUR_THRESHOLD = 60;
const DARK_THRESHOLD = 50;
const BRIGHT_THRESHOLD = 215;

export type QualityStats = { width: number; height: number; sharpness: number; brightness: number };

/** Variance of the Laplacian: low means few sharp edges, i.e. a blurry photo (same idea as OpenCV's blur check). */
export const laplacianVariance = (gray: Float32Array, width: number, height: number) => {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
};

export const meanBrightness = (gray: Float32Array) => {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  return gray.length ? sum / gray.length : 0;
};

/** Plain-language warnings for a measured photo; empty when it looks fine. */
export const qualityWarnings = ({ width, height, sharpness, brightness }: QualityStats) => {
  const warnings: string[] = [];
  if (Math.max(width, height) < MIN_LONG_SIDE)
    warnings.push(`Low resolution (${width}×${height}). The numbers on the deed may be unreadable.`);
  if (sharpness < BLUR_THRESHOLD) warnings.push("This photo looks blurry. Hold the phone steady and tap to focus.");
  if (brightness < DARK_THRESHOLD) warnings.push("This photo is too dark. Retake it in better light.");
  if (brightness > BRIGHT_THRESHOLD) warnings.push("This photo is overexposed. Avoid flash and direct glare.");
  return warnings;
};

/** Measures a picked image file in the browser. */
export const measureImage = async (file: Blob): Promise<QualityStats> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, ANALYSIS_SIZE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  const stats = {
    width: bitmap.width,
    height: bitmap.height,
    sharpness: laplacianVariance(gray, w, h),
    brightness: meanBrightness(gray),
  };
  bitmap.close();
  return stats;
};
