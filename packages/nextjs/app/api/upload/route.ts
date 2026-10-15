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
  if (!signer) return NextResponse.json({ error: "กรุณายืนยันตัวตนด้วย wallet อีกครั้ง" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5MB" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImageType(bytes)) {
    return NextResponse.json({ error: "รองรับเฉพาะรูป JPG, PNG หรือ WEBP" }, { status: 415 });
  }

  try {
    return NextResponse.json(await savePhoto(bytes));
  } catch (e) {
    console.error("upload failed", e instanceof PhotoStoreError ? e.message : e);
    return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
