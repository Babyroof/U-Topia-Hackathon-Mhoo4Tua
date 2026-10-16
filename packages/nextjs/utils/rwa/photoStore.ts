import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { parseImageRef, resolveLocalImagePath, sniffImageType } from "~~/utils/rwa/imageRef";

/**
 * Server-only storage for deed photos.
 * - PINATA_JWT set: Pinata *private* IPFS (not reachable from public gateways), read back through a short-lived signed link.
 * - Otherwise (local dev only): files under packages/nextjs/.uploads/<uuid>.
 */
const LOCAL_DIR = path.join(process.cwd(), ".uploads");

export class PhotoStoreError extends Error {}

export const savePhoto = async (bytes: Uint8Array) => {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const jwt = process.env.PINATA_JWT;

  if (jwt) {
    const form = new FormData();
    form.append("file", new Blob([bytes as BlobPart]), `deed-${sha256.slice(0, 12)}`);
    form.append("network", "private");
    const res = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });
    const json = await res.json().catch(() => null);
    const cid = json?.data?.cid;
    if (!res.ok || typeof cid !== "string") throw new PhotoStoreError("pinata upload failed");
    return { ref: `ipfs:${cid}`, sha256 };
  }

  if (process.env.VERCEL) throw new PhotoStoreError("PINATA_JWT is not set");
  const id = randomUUID();
  const file = resolveLocalImagePath(LOCAL_DIR, id);
  if (!file) throw new PhotoStoreError("bad id");
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(file, bytes);
  return { ref: `local:${id}`, sha256 };
};

export const loadPhoto = async (rawRef: string) => {
  const ref = parseImageRef(rawRef);
  if (!ref) return null;

  let bytes: Uint8Array;
  if (ref.kind === "local") {
    const file = resolveLocalImagePath(LOCAL_DIR, ref.id);
    if (!file) return null;
    try {
      bytes = await readFile(file);
    } catch {
      return null;
    }
  } else {
    const jwt = process.env.PINATA_JWT;
    const gateway = process.env.PINATA_GATEWAY;
    if (!jwt || !gateway) throw new PhotoStoreError("PINATA_JWT / PINATA_GATEWAY not set");
    const linkRes = await fetch("https://api.pinata.cloud/v3/files/download_link", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `https://${gateway}/files/${ref.cid}`,
        expires: 60,
        date: Math.floor(Date.now() / 1000),
        method: "GET",
      }),
    });
    const link = (await linkRes.json().catch(() => null))?.data;
    if (!linkRes.ok || typeof link !== "string") throw new PhotoStoreError("pinata link failed");
    const fileRes = await fetch(link);
    if (!fileRes.ok) return null;
    bytes = new Uint8Array(await fileRes.arrayBuffer());
  }

  const type = sniffImageType(bytes);
  return type ? { bytes, type } : null;
};
