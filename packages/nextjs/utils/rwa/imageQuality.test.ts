import { describe, expect, it } from "vitest";
import { laplacianVariance, meanBrightness, qualityWarnings } from "~~/utils/rwa/imageQuality";

const W = 64;
const H = 64;
const image = (pixel: (x: number, y: number) => number) => {
  const g = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = pixel(x, y);
  return g;
};

describe("photo quality checks", () => {
  it("a sharp checkerboard scores far higher than a smooth gradient", () => {
    const sharp = image((x, y) => (((x >> 2) + (y >> 2)) % 2 ? 230 : 20));
    const blurry = image(x => 100 + x);
    expect(laplacianVariance(sharp, W, H)).toBeGreaterThan(1000);
    expect(laplacianVariance(blurry, W, H)).toBeLessThan(1);
  });

  it("measures brightness", () => {
    expect(meanBrightness(image(() => 30))).toBe(30);
  });

  it("warns about low resolution, blur, darkness and glare", () => {
    expect(qualityWarnings({ width: 3000, height: 2000, sharpness: 500, brightness: 130 })).toEqual([]);
    const all = qualityWarnings({ width: 640, height: 480, sharpness: 10, brightness: 20 }).join(" ");
    expect(all).toContain("Low resolution");
    expect(all).toContain("blurry");
    expect(all).toContain("too dark");
    expect(qualityWarnings({ width: 3000, height: 2000, sharpness: 500, brightness: 240 })[0]).toContain("overexposed");
  });
});
