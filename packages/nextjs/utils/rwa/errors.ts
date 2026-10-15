/** Contract custom errors (and common wallet errors) in plain language. Raw revert data is never shown to users. */
const CONTRACT_ERRORS: Record<string, string> = {
  SerialAlreadyTokenized: "This deed number already has an NFT. It can only be issued once.",
  NotRequestPartner: "This request was sent to a different partner.",
  NotPartner: "This partner is not active (never added, or deactivated).",
  RequestNotPending: "This request has already been decided.",
  EmptyField: "Some required information is missing.",
  NotAdmin: "Only the platform admin can do this.",
  NotHolder: "Only the holder of this deed's NFT can do this.",
  NotIssuer: "Only the partner who issued this NFT can do this.",
  RedemptionNotPending: "This withdrawal has already been handled.",
  NothingToRegister: "This deed has no transfer waiting for registration.",
  VaultAlreadySet: "The vault is already set.",
  BadRecipient: "The receiver address is invalid or is your own wallet.",
  BadTime: "The unlock time must be in the future.",
  NotLocked: "This deal is no longer locked.",
  NotSender: "Only the person who created the deal can cancel it.",
  TooEarly: "The unlock time hasn't arrived yet.",
  TooLate: "The unlock time has passed, so it can no longer be cancelled.",
  ERC721InsufficientApproval: "The vault hasn't been allowed to hold this NFT yet.",
  ERC721IncorrectOwner: "You don't hold this deed's NFT.",
};

export const friendlyError = (raw: string) => {
  const name = Object.keys(CONTRACT_ERRORS).find(key => new RegExp(`\\b${key}\\b`).test(raw));
  if (name) return CONTRACT_ERRORS[name];
  if (/user (rejected|denied)|rejected the request/i.test(raw)) return "You cancelled in your wallet.";
  if (/insufficient funds/i.test(raw)) return "Not enough AVAX in your wallet to pay the network fee.";
  if (/wrong network|chain mismatch/i.test(raw)) return "Your wallet is on the wrong network.";
  return "Something went wrong. Please try again.";
};

/** Which contract error a failed call hit, so a form can show it under the matching field. */
export const contractErrorName = (e: unknown) => {
  const text = e instanceof Error ? `${e.message} ${(e as { shortMessage?: string }).shortMessage ?? ""}` : String(e);
  return Object.keys(CONTRACT_ERRORS).find(key => new RegExp(`\\b${key}\\b`).test(text));
};
