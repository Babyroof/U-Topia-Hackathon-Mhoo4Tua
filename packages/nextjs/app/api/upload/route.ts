import { NextRequest, NextResponse } from "next/server";
import { MAX_IMAGE_BYTES, sniffImageType } from "~~/utils/rwa/imageRef";
import { PhotoStoreError, savePhoto } from "~~/utils/rwa/photoStore";
import { verifyViewerHeaders } from "~~/utils/rwa/viewerAuth";

/**
 * Upload one deed photo (multipart field "file"). Needs a fresh wallet signature.
 * Returns { ref, sha256 }; the client puts both in the request details on-chain.
 */
export async function POST(req: NextRequest) {
  const signer = await verifyViewerHeaders(req.headers);
  if (!signer) return NextResponse.json({ error: "Please sign in with your wallet again" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "File is larger than 5 MB" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImageType(bytes)) {
    return NextResponse.json({ error: "Only JPG, PNG or WEBP photos are accepted" }, { status: 415 });
  }

  try {
    return NextResponse.json(await savePhoto(bytes));
  } catch (e) {
    console.error("upload failed", e instanceof PhotoStoreError ? e.message : e);
    return NextResponse.json({ error: "Upload failed, please try again" }, { status: 500 });
  }
}
