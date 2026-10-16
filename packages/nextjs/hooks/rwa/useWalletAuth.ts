import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { AUTH_HEADERS, SIGNATURE_TTL_SECONDS, buildViewerMessage } from "~~/utils/rwa/viewerAuth";

// one signature per wallet, reused until shortly before it expires
const cache = new Map<string, { message: string; signature: string; issuedAt: number }>();

/** Headers that prove to our API routes that this browser controls the connected wallet (one free signature). */
export const useWalletAuth = () => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  return useCallback(async () => {
    if (!address) throw new Error("wallet not connected");
    const now = Math.floor(Date.now() / 1000);
    let entry = cache.get(address);
    if (!entry || now - entry.issuedAt > SIGNATURE_TTL_SECONDS - 60) {
      const message = buildViewerMessage(address, now);
      const signature = await signMessageAsync({ message });
      entry = { message, signature, issuedAt: now };
      cache.set(address, entry);
    }
    return {
      [AUTH_HEADERS.message]: encodeURIComponent(entry.message),
      [AUTH_HEADERS.signature]: entry.signature,
    };
  }, [address, signMessageAsync]);
};
