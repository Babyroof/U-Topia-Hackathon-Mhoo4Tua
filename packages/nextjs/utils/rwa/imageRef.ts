import path from "path";

/**
 * Server-only helpers for deed photos. Users never send a file path or ref:
 * the API takes a request id + side, reads the ref from the chain, and resolves it here.
 */
export type ImageRef = { kind: "ipfs"; cid: string } | { kind: "local"; id: string };

const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,100})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const isPhotoSide = (side: unknown): side is "front" | "back" => side === "front" || side === "back";

export const parseImageRef = (ref: unknown): ImageRef | null => {
  if (typeof ref !== "string") return null;
  const [kind, value, ...rest] = ref.split(":");
  if (rest.length > 0 || !value) return null;
  if (kind === "ipfs" && CID_RE.test(value)) return { kind, cid: value };
  if (kind === "local" && UUID_RE.test(value)) return { kind, id: value };
  return null;
};

/** Absolute path of a locally stored photo, or null if `id` is anything but a v4 uuid inside `baseDir`. */
export const resolveLocalImagePath = (baseDir: string, id: string): string | null => {
  if (!UUID_RE.test(id)) return null;
  const root = path.resolve(baseDir);
  const file = path.resolve(root, id);
  return file.startsWith(root + path.sep) ? file : null;
};

/** Content type from the file's first bytes (never trust the browser's MIME type). */
export const sniffImageType = (bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b))
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Only the person who filed the request and the partner it was sent to may see the deed photos. */
export const canViewRequestPhotos = (viewer: string, request: { requester: string; partner: string }) =>
  same(viewer, request.requester) || same(viewer, request.partner);
