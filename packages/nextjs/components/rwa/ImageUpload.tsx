"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletAuth } from "~~/hooks/rwa/useWalletAuth";
import type { DeedPhoto } from "~~/utils/rwa/deed";
import { measureImage, qualityWarnings } from "~~/utils/rwa/imageQuality";

const MAX_MB = 5;

class UploadError extends Error {}

/** Picks a photo file and uploads it to our server (which stores it privately); the user never types a link. */
export const ImageUpload = ({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: DeedPhoto;
  /** the uploaded photo, plus a local preview URL for showing it again (e.g. in a summary) */
  onChange: (photo?: DeedPhoto, previewUrl?: string) => void;
  error?: string;
}) => {
  const getAuth = useWalletAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [warnings, setQualityWarnings] = useState<string[]>([]);

  // parent cleared the form: drop the preview and the chosen file
  useEffect(() => {
    if (!value) {
      setPreview(undefined);
      setQualityWarnings([]);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [value]);

  const pick = async (file?: File) => {
    setUploadError("");
    setQualityWarnings([]);
    onChange(undefined);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Only JPG, PNG or WEBP photos are accepted");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File is larger than ${MAX_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      // quality is only a warning: the photo still uploads
      setQualityWarnings(await measureImage(file).then(qualityWarnings, () => []));
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers: await getAuth(), body });
      const json = await res.json();
      if (!res.ok) throw new UploadError(json.error ?? "Upload failed, please try again");
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange({ ref: json.ref, sha256: json.sha256 }, url);
    } catch (e) {
      setUploadError(e instanceof UploadError ? e.message : "Upload failed, please try again");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="label-text font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={`file-input file-input-bordered file-input-sm w-full ${error || uploadError ? "file-input-error" : ""}`}
          onChange={e => pick(e.target.files?.[0])}
          disabled={uploading}
        />
        {uploading && <span className="loading loading-spinner loading-sm" />}
      </div>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="w-36 h-24 object-cover rounded border border-base-300" />
      )}
      {warnings.length > 0 && !uploadError && (
        <div className="notice notice-warning text-sm flex-col items-start gap-1">
          {warnings.map(w => (
            <span key={w}>⚠ {w}</span>
          ))}
          <span className="opacity-80">You can still send it, but the partner may reject an unreadable photo.</span>
        </div>
      )}
      {(uploadError || error) && <span className="text-sm text-error">{uploadError || error}</span>}
    </div>
  );
};
