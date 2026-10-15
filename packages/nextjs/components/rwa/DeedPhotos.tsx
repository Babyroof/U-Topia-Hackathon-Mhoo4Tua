"use client";

import { useEffect, useState } from "react";
import { useWalletAuth } from "~~/hooks/rwa/useWalletAuth";
import type { PhotoSide } from "~~/utils/rwa/deed";

const SIDES: { side: PhotoSide; label: string }[] = [
  { side: "front", label: "ด้านหน้า" },
  { side: "back", label: "ด้านหลัง" },
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
        if (res.status === 403) throw new Error("ดูรูปได้เฉพาะผู้ยื่นคำขอและ partner ที่รับคำขอนี้");
        if (!res.ok) throw new Error("โหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
        next[side] = URL.createObjectURL(await res.blob());
      }
      setUrls(next);
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith("ดู") ? e.message : "โหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  if (sides.length === 0) return <p className="text-sm opacity-60 m-0">ไม่มีรูปโฉนดแนบมา</p>;

  const loaded = Object.keys(urls).length > 0;

  return (
    <div className="flex flex-col gap-2">
      {!loaded && (
        <button className="btn btn-sm btn-outline self-start" onClick={load} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : "แสดงรูปโฉนด"}
        </button>
      )}
      {!loaded && (
        <span className="text-xs opacity-60">wallet จะขอให้เซ็นข้อความยืนยันตัวตน 1 ครั้ง (ฟรี ไม่ใช่ธุรกรรม)</span>
      )}
      {error && <span className="text-sm text-error">{error}</span>}

      {loaded && (
        <div className="flex gap-3 flex-wrap">
          {SIDES.filter(s => urls[s.side]).map(({ side, label }) => (
            <button
              key={side}
              className="flex flex-col items-center gap-1"
              onClick={() => setZoom(urls[side])}
              aria-label={`ขยายรูป${label}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[side]}
                alt={`โฉนด${label}`}
                className="w-36 h-28 object-cover rounded border border-base-300"
              />
              <span className="text-xs opacity-70">{label} (กดเพื่อขยาย)</span>
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div className="modal modal-open" onClick={() => setZoom(undefined)}>
          <div className="modal-box max-w-5xl p-2 bg-base-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt="รูปโฉนดขนาดเต็ม" className="w-full h-auto max-h-[85vh] object-contain" />
          </div>
          <button className="btn btn-circle btn-sm absolute top-4 right-4" aria-label="ปิด">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
