"use client";

import { useEffect, useState } from "react";
import { useWalletAuth } from "~~/hooks/rwa/useWalletAuth";
import type { PhotoSide } from "~~/utils/rwa/deed";

class PhotoError extends Error {}

const SIDES: { side: PhotoSide; label: string }[] = [
  { side: "front", label: "Front" },
  { side: "back", label: "Back" },
];

/**
 * Deed photo thumbnails for a request. Only the requester and the request's partner can load them;
 * the wallet signs a free message once so the server knows who is asking.
 */
export const DeedPhotos = ({ requestId, sides }: { requestId: bigint; sides: PhotoSide[] }) => {
  const getAuth = useWalletAuth();
  const [urls, setUrls] = useState<Partial<Record<PhotoSide, string>>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<string>();

  useEffect(() => {
    setUrls({});
    setError("");
  }, [requestId]);

  useEffect(() => () => Object.values(urls).forEach(u => u && URL.revokeObjectURL(u)), [urls]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await getAuth();
      const next: Partial<Record<PhotoSide, string>> = {};
      for (const side of sides) {
        const res = await fetch(`/api/deed-image?requestId=${requestId}&side=${side}`, { headers });
        if (res.status === 403)
          throw new PhotoError("Only the requester and this request's partner can see these photos");
        if (!res.ok) throw new PhotoError("Could not load the photos, please try again");
        next[side] = URL.createObjectURL(await res.blob());
      }
      setUrls(next);
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : "Could not load the photos, please try again");
    } finally {
      setLoading(false);
    }
  };

  if (sides.length === 0) return <p className="text-sm opacity-60 m-0">No deed photos attached</p>;

  const loaded = Object.keys(urls).length > 0;

  return (
    <div className="flex flex-col gap-2">
      {!loaded && (
        <button className="btn btn-sm btn-outline self-start" onClick={load} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : "Show deed photos"}
        </button>
      )}
      {!loaded && (
        <span className="text-xs opacity-60">
          Your wallet asks you to sign a message once to prove it&apos;s you (free, not a transaction).
        </span>
      )}
      {error && <span className="text-sm text-error">{error}</span>}

      {loaded && (
        <div className="flex gap-3 flex-wrap">
          {SIDES.filter(s => urls[s.side]).map(({ side, label }) => (
            <button
              key={side}
              className="flex flex-col items-center gap-1"
              onClick={() => setZoom(urls[side])}
              aria-label={`Enlarge ${label.toLowerCase()} photo`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[side]}
                alt={`Deed, ${label.toLowerCase()}`}
                className="w-36 h-28 object-cover rounded border border-base-300"
              />
              <span className="text-xs opacity-70">{label} (tap to enlarge)</span>
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div className="modal modal-open" onClick={() => setZoom(undefined)}>
          <div className="modal-box max-w-5xl p-2 bg-base-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt="Deed photo, full size" className="w-full h-auto max-h-[85vh] object-contain" />
          </div>
          <button className="btn btn-circle btn-sm absolute top-4 right-4" aria-label="Close">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
