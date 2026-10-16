"use client";

import { useEffect, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (zoom) dialogRef.current?.showModal();
  }, [zoom]);

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

      {/* native <dialog> opens in the browser's top layer, so nothing on the page can cover or clip it */}
      <dialog
        ref={dialogRef}
        className="m-auto bg-transparent p-0 max-w-[95vw] max-h-[95vh] backdrop:bg-black/80"
        onClose={() => setZoom(undefined)}
        onClick={() => dialogRef.current?.close()}
      >
        {zoom && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={zoom} alt="Deed photo, full size" className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl" />
        )}
        <p className="text-center text-white text-sm mt-2 mb-0">Tap anywhere to close</p>
      </dialog>
    </div>
  );
};
