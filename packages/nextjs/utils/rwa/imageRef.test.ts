import path from "path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import {
  canViewRequestPhotos,
  isPhotoSide,
  parseImageRef,
  resolveLocalImagePath,
  sniffImageType,
} from "~~/utils/rwa/imageRef";
import { buildViewerMessage, verifyViewer } from "~~/utils/rwa/viewerAuth";

const BASE = path.resolve("/srv/app/.uploads");
const UUID = "3f2b8c1e-9a4d-4b7e-8c2f-1a2b3c4d5e6f";

describe("deed photo paths cannot escape the upload folder", () => {
  it.each([
    "../../etc/passwd",
    "../../../../etc/passwd",
    "/etc/passwd",
    "..%2F..%2Fetc%2Fpasswd",
    "..\\..\\windows\\win.ini",
    `${UUID}/../../etc/passwd`,
    `../${UUID}`,
    `${UUID}.jpg`,
    "",
    ".",
    "..",
  ])("rejects %j", id => {
    expect(resolveLocalImagePath(BASE, id)).toBeNull();
  });

  it("accepts a v4 uuid and keeps it inside the folder", () => {
    const file = resolveLocalImagePath(BASE, UUID);
    expect(file).toBe(path.join(BASE, UUID));
    expect(file!.startsWith(BASE + path.sep)).toBe(true);
  });

  it.each([
    "local:../../etc/passwd",
    "local:/etc/passwd",
    `local:${UUID}:extra`,
    "file:/etc/passwd",
    "https://evil.example/x.jpg",
    "ipfs:../../etc/passwd",
    "ipfs:not-a-cid",
    "",
    undefined,
    42,
  ])("parseImageRef rejects %j", ref => {
    expect(parseImageRef(ref)).toBeNull();
  });

  it("parseImageRef accepts local uuids and CIDs", () => {
    expect(parseImageRef(`local:${UUID}`)).toEqual({ kind: "local", id: UUID });
    const cid = "bafkreih5aznjvttude6c3wbvqeebb6rlx5wkbzyppv7garjiubll2ceym4";
    expect(parseImageRef(`ipfs:${cid}`)).toEqual({ kind: "ipfs", cid });
  });

  it("only front/back are valid sides", () => {
    expect(isPhotoSide("front")).toBe(true);
    expect(isPhotoSide("back")).toBe(true);
    expect(isPhotoSide("../front")).toBe(false);
  });
});

describe("file type comes from bytes, not the name", () => {
  it("detects jpeg/png/webp and rejects others", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF0000WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("root:x:0:0:root:/root:/bin/bash"))).toBeNull();
  });
});

describe("only the requester and the partner see the photos", () => {
  const request = {
    requester: "0x1111111111111111111111111111111111111111",
    partner: "0x2222222222222222222222222222222222222222",
  };
  it("allows requester and partner (any letter case)", () => {
    expect(canViewRequestPhotos(request.requester, request)).toBe(true);
    expect(canViewRequestPhotos(request.partner.toUpperCase().replace("0X", "0x"), request)).toBe(true);
  });
  it("denies anyone else", () => {
    expect(canViewRequestPhotos("0x3333333333333333333333333333333333333333", request)).toBe(false);
  });
});

describe("wallet signature check", () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const now = 1_800_000_000;

  it("accepts a fresh signature from the named wallet", async () => {
    const message = buildViewerMessage(account.address, now);
    const signature = await account.signMessage({ message });
    expect(await verifyViewer(message, signature, now + 5)).toBe(account.address);
  });

  it("rejects expired, future-dated, tampered or someone else's signatures", async () => {
    const message = buildViewerMessage(account.address, now);
    const signature = await account.signMessage({ message });
    expect(await verifyViewer(message, signature, now + 11 * 60)).toBeNull();
    expect(await verifyViewer(message, signature, now - 5 * 60)).toBeNull();

    const other = privateKeyToAccount(generatePrivateKey());
    const claimsOther = buildViewerMessage(other.address, now);
    expect(await verifyViewer(claimsOther, signature, now)).toBeNull();
    expect(await verifyViewer(claimsOther, await account.signMessage({ message: claimsOther }), now)).toBeNull();

    expect(await verifyViewer("hello", signature, now)).toBeNull();
    expect(await verifyViewer(message, "nope", now)).toBeNull();
  });
});
