import { NextRequest, NextResponse } from "next/server";
import { decodeDeed } from "~~/utils/rwa/deed";
import { canViewRequestPhotos, isPhotoSide } from "~~/utils/rwa/imageRef";
import { loadPhoto } from "~~/utils/rwa/photoStore";
import { getRwaReader } from "~~/utils/rwa/serverChain";
import { verifyViewerHeaders } from "~~/utils/rwa/viewerAuth";

/**
 * GET /api/deed-image?requestId=<number>&side=front|back
 * The caller never names a file: the photo ref comes from the request stored on-chain.
 * Only the requester and the request's partner get the image.
 */
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId") ?? "";
  const side = req.nextUrl.searchParams.get("side");
  if (!/^\d{1,9}$/.test(requestId) || !isPhotoSide(side)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const viewer = await verifyViewerHeaders(req.headers);
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const reader = getRwaReader();
  if (!reader) return NextResponse.json({ error: "contract not deployed" }, { status: 503 });

  let request;
  try {
    request = await reader.getRequest(BigInt(requestId));
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!canViewRequestPhotos(viewer, request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ref = decodeDeed(request.details)?.photos[side]?.ref;
  try {
    const photo = ref ? await loadPhoto(ref) : null;
    if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });
    return new NextResponse(photo.bytes as BodyInit, {
      headers: {
        "Content-Type": photo.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("deed-image failed", e);
    return NextResponse.json({ error: "photo storage unavailable" }, { status: 502 });
  }
}
