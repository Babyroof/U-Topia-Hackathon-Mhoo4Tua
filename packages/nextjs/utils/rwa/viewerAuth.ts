import { type Address, getAddress, isAddress, verifyMessage } from "viem";

/**
 * Proves "this browser controls wallet X" for the photo API, without a password or private key:
 * the wallet signs a short message with a timestamp (free, no transaction), the server checks the signature.
 */
export const SIGNATURE_TTL_SECONDS = 10 * 60;

const HEADER = "RWA Vault: confirm you control this wallet to use deed photos (free, not a transaction)";

export const buildViewerMessage = (address: string, issuedAt: number) =>
  `${HEADER}\nwallet: ${getAddress(address)}\ntime: ${issuedAt}`;

/** Returns the signer if the message is ours, fresh, and signed by the wallet it names; otherwise null. */
export const verifyViewer = async (
  message: unknown,
  signature: unknown,
  now = Math.floor(Date.now() / 1000),
): Promise<Address | null> => {
  if (typeof message !== "string" || typeof signature !== "string" || !signature.startsWith("0x")) return null;
  const match = /^wallet: (0x[0-9a-fA-F]{40})\ntime: (\d{1,12})$/.exec(message.slice(HEADER.length + 1));
  if (!message.startsWith(HEADER + "\n") || !match || !isAddress(match[1])) return null;

  const issuedAt = Number(match[2]);
  if (issuedAt > now + 60 || now - issuedAt > SIGNATURE_TTL_SECONDS) return null;

  const address = getAddress(match[1]);
  try {
    const ok = await verifyMessage({ address, message, signature: signature as `0x${string}` });
    return ok ? address : null;
  } catch {
    return null;
  }
};

/** Header names carrying the signed message (URI-encoded so any text is header-safe) and signature. */
export const AUTH_HEADERS = { message: "x-rwa-message", signature: "x-rwa-signature" } as const;

export const verifyViewerHeaders = (headers: Headers) => {
  let message: string;
  try {
    message = decodeURIComponent(headers.get(AUTH_HEADERS.message) ?? "");
  } catch {
    return Promise.resolve(null);
  }
  return verifyViewer(message, headers.get(AUTH_HEADERS.signature));
};
