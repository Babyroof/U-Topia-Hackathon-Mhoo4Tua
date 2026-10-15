/** Demo scope: land title deeds only. */
export const ASSET_TYPES = [
  {
    value: "Land Title Deed",
    icon: "🏞️",
    serialLabel: "Title deed number",
    namePlaceholder: "2 rai plot, Hang Dong, Chiang Mai",
  },
] as const;

export const LAND = ASSET_TYPES[0];

const GENERIC_TYPE = { icon: "📄", serialLabel: "Serial or document number", namePlaceholder: "What is it?" };

export const typeInfo = (assetType?: string) =>
  ASSET_TYPES.find(t => t.value.toLowerCase() === (assetType ?? "").trim().toLowerCase()) ?? GENERIC_TYPE;

export const assetIcon = (assetType?: string) => typeInfo(assetType).icon;

export const REQUEST_STATUS = ["None", "Pending", "Approved", "Rejected"] as const;
export const REQUEST_BADGE = ["badge-ghost", "badge-warning", "badge-success", "badge-error"] as const;

export const DEAL_STATUS = ["None", "Locked", "Released", "Cancelled"] as const;
export const DEAL_BADGE = ["badge-ghost", "badge-warning", "badge-success", "badge-neutral"] as const;

export const sameAddress = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export const formatTime = (ts: bigint | number) =>
  new Date(Number(ts) * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const formatCountdown = (seconds: number) => {
  if (seconds <= 0) return "Ready";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};
