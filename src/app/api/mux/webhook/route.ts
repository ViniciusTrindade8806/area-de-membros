import { NextRequest, NextResponse } from "next/server";
import { database, mux, checked } from "@/lib/server";
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let event;
  try {
    if (!process.env.MUX_WEBHOOK_SECRET) throw Error("Webhook não configurado");
    event = mux().webhooks.unwrap(raw, req.headers);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }
  try {
    const db = database();
    if (event.type === "video.asset.ready") {
      const asset = event.data;
      const playback = asset.playback_ids?.find((p) => p.policy === "signed");
      if (asset.passthrough && playback)
        checked(
          await db
            .from("lessons")
            .update({
              asset_id: asset.id,
              playback_id: playback.id,
              duration: asset.duration,
              status: "ready",
            })
            .eq("id", asset.passthrough)
            .eq("upload_id", asset.upload_id || ""),
        );
    } else if (event.type === "video.asset.errored") {
      const asset = event.data;
      if (asset.passthrough)
        checked(
          await db
            .from("lessons")
            .update({ status: "error" })
            .eq("id", asset.passthrough)
            .eq("upload_id", asset.upload_id || ""),
        );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mux webhook]", e);
    return NextResponse.json(
      { error: "Falha ao processar evento" },
      { status: 500 },
    );
  }
}
