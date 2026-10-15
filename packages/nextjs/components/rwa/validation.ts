import { isAddress } from "viem";
import { sameAddress } from "~~/components/rwa/utils";

/** Each validator returns a plain-language message to show under the field, or undefined when the value is fine. */
export const requiredError = (value: string, what = "this field") =>
  value.trim() ? undefined : `Please enter ${what}`;

export const addressError = (value: string, self?: string) => {
  if (!value.trim()) return "Please enter a wallet address";
  if (!isAddress(value.trim())) return "A wallet address starts with 0x followed by 40 characters";
  if (sameAddress(value.trim(), self)) return "You can't send to your own wallet";
  return undefined;
};

export const unlockTimeError = (unlockTime: number | undefined, now: number) => {
  if (!unlockTime) return "Pick an unlock date and time";
  if (unlockTime <= now)
    return "That time has already passed. Pick a time in the future: a deal can't unlock in the past.";
  return undefined;
};

export const numberError = (value: string, { max, label }: { max?: number; label: string }) => {
  if (!value.trim()) return `Enter ${label} (0 if none)`;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return `${label} must be a number, 0 or more`;
  if (max !== undefined && n > max) return `${label} can be at most ${max}`;
  return undefined;
};

export const hasErrors = (errors: Record<string, string | undefined>) => Object.values(errors).some(Boolean);
