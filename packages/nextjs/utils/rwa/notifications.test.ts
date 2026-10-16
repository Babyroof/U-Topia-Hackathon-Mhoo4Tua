import { describe, expect, it } from "vitest";
import type { TimelineEntry } from "~~/hooks/rwa/useDeedTimeline";
import { notificationFor } from "~~/utils/rwa/notifications";

const A = "0xAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xBbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const P = "0xCccccccccccccccccccccccccccccccccccccccc";
const X = "0xDddddddddddddddddddddddddddddddddddddddd";

const entry = (kind: TimelineEntry["kind"], parties: string[], extra: Partial<TimelineEntry> = {}): TimelineEntry => ({
  key: kind,
  kind,
  text: "",
  blockNumber: 1n,
  txLink: "",
  parties,
  partner: P,
  deedName: "Deed no. 00000",
  ...extra,
});

const who = (e: TimelineEntry) => [A, B, P, X].filter(w => notificationFor(e, w) !== null);

describe("each wallet only gets its own news", () => {
  it("new request: only the partner", () => expect(who(entry("requested", [A]))).toEqual([P]));
  it("approved / rejected: only the requester", () => {
    expect(who(entry("approved", [A]))).toEqual([A]);
    expect(who(entry("rejected", [A], { text: "Rejected: blurry" }))).toEqual([A]);
    expect(notificationFor(entry("rejected", [A], { text: "Rejected: blurry" }), A)).toContain("Reason: blurry");
  });
  it("deal created: only the receiver, not the sender who made it", () =>
    expect(who(entry("dealCreated", [A, B]))).toEqual([B]));
  it("paid: only the seller", () => expect(who(entry("paid", [A, B], { amount: "0.1" }))).toEqual([A]));
  it("released: receiver, sender and the issuing partner, each with their own wording", () => {
    const e = entry("released", [A, B]);
    expect(who(e)).toEqual([A, B, P]);
    expect(notificationFor(e, B)).toContain("now yours");
    expect(notificationFor(e, A)).toContain("delivered");
    expect(notificationFor(e, P)).toContain("waiting for transfer registration");
  });
  it("cancelled / reclaimed: only the receiver", () => {
    expect(who(entry("cancelled", [A, B]))).toEqual([B]);
    expect(who(entry("reclaimed", [A, B]))).toEqual([B]);
  });
  it("registered: the new owner, not the partner who pressed the button", () =>
    expect(who(entry("registered", [B]))).toEqual([B]));
  it("withdrawal: partner on request, holder when done", () => {
    expect(who(entry("withdrawRequested", [A]))).toEqual([P]);
    expect(who(entry("withdrawn", [A]))).toEqual([A]);
  });
  it("matches addresses regardless of letter case", () =>
    expect(who(entry("approved", [A.toLowerCase()]))).toEqual([A]));
  it("missing party data notifies nobody", () => expect(who(entry("approved", [""]))).toEqual([]));
});
