/**
 * Land title deed details, stored on-chain as a JSON string in `Request.details` / `Asset.details`.
 * The deed number itself is the contract's `serial` (unique, checked on-chain).
 */
export const LAND_TYPE = "Land Title Deed";

export type PhotoSide = "front" | "back";

export type DeedPhoto = {
  /** "ipfs:<cid>" (Pinata private) or "local:<uuid>" (local dev). Only the server resolves it. */
  ref: string;
  /** sha256 of the file, so anyone can check the photo the partner saw was not swapped later */
  sha256: string;
};

export type DeedDetails = {
  landNo: string;
  surveyPage: string;
  tambon: string;
  amphoe: string;
  province: string;
  area: { rai: string; ngan: string; wa: string };
  photos: Partial<Record<PhotoSide, DeedPhoto>>;
};

export const encodeDeed = (d: DeedDetails) => JSON.stringify(d);

export const decodeDeed = (json?: string): DeedDetails | undefined => {
  if (!json) return undefined;
  try {
    const d = JSON.parse(json);
    if (typeof d !== "object" || d === null || typeof d.area !== "object") return undefined;
    return { ...d, photos: typeof d.photos === "object" && d.photos ? d.photos : {} };
  } catch {
    return undefined;
  }
};

export const deedTitle = (serial: string, d?: DeedDetails) =>
  d ? `Deed no. ${serial}, ${d.tambon}, ${d.amphoe}, ${d.province}` : `Deed no. ${serial}`;

export const formatArea = (d?: DeedDetails) =>
  d ? `${d.area.rai || 0} rai ${d.area.ngan || 0} ngan ${d.area.wa || 0} sq. wa` : "-";
