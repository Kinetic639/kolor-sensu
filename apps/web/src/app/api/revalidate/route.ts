import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.CMS_REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    path?: unknown;
  } | null;
  const path = typeof body?.path === "string" ? body.path : null;

  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
