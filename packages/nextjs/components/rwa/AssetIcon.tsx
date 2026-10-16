import { DocumentTextIcon, MapIcon } from "@heroicons/react/24/outline";
import { typeInfo } from "~~/components/rwa/utils";

const SIZES = {
  sm: { tile: "h-7 w-7 rounded-lg", icon: "h-4 w-4" },
  md: { tile: "h-11 w-11 rounded-xl", icon: "h-6 w-6" },
} as const;

/** Asset-type badge: a deep-blue tile with a line icon (map for land title deeds). */
export const AssetIcon = ({ assetType, size = "sm" }: { assetType?: string; size?: keyof typeof SIZES }) => {
  const Icon = typeInfo(assetType).value === "Land Title Deed" ? MapIcon : DocumentTextIcon;
  return (
    <span
      className={`inline-grid place-items-center align-middle shrink-0 mr-2 bg-primary text-primary-content ${SIZES[size].tile}`}
      aria-hidden
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
};
