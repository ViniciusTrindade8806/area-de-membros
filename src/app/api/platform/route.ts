import { NextRequest, NextResponse } from "next/server";
import { database, mux, checked } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const db = database();
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!bearer)
      return NextResponse.json(
        { error: "Entre na sua conta." },
        { status: 401 },
      );
    const { data: auth, error } = await db.auth.getUser(bearer);
    if (error || !auth.user)
      return NextResponse.json(
        { error: "Sua sessão expirou. Entre novamente." },
        { status: 401 },
      );
    const profile = checked(
      await db.from("profiles").select("*").eq("id", auth.user.id).single(),
    );
    if (profile.suspended)
      return NextResponse.json(
        { error: "Seu acesso está suspenso. Contate a equipe E-Drive GO." },
        { status: 403 },
      );
    const b = await req.json();
    const admin = profile.role === "admin";
    const uid = auth.user.id;
    const modules = checked(
      await db.from("modules").select("*").order("position").order("id"),
    );
    const sortLessons = (ls: any[]) =>
      ls.sort(
        (a, b) =>
          modules.findIndex((m) => m.id === a.module) -
            modules.findIndex((m) => m.id === b.module) ||
          a.position - b.position ||
          a.id.localeCompare(b.id),
      );
    if (b.action === "catalog") {
      const [lr, pr] = await Promise.all([
        db.from("lessons").select("*").order("position"),
        db
          .from("progress")
          .select("lesson_id,position,completed")
          .eq("user_id", uid),
      ]);
      const progress = checked(pr);
      const lessons = sortLessons(
        checked(lr).filter((l) => admin || l.published),
      );
      const done = new Set(
        progress.filter((p) => p.completed).map((p) => p.lesson_id),
      );
      const result = await Promise.all(
        lessons.map(async (l, i) => {
          let material_url;
          const allowed =
            admin ||
            done.has(l.id) ||
            lessons.slice(0, i).every((p) => done.has(p.id));
          if (allowed && l.material_path) {
            material_url = checked(
              await db.storage
                .from("materials")
                .createSignedUrl(l.material_path, 600),
            ).signedUrl;
          }
          return {
            ...l,
            material_path: undefined,
            material_url,
            asset_id: undefined,
            upload_id: undefined,
          };
        }),
      );
      return NextResponse.json({ lessons: result, progress, admin, modules });
    }
    if (["playback", "progress"].includes(b.action)) {
      const lessons = sortLessons(
        checked(
          await db
            .from("lessons")
            .select("*")
            .eq("published", true)
            .order("position")
            .order("id"),
        ),
      );
      const own = checked(
        await db
          .from("progress")
          .select("lesson_id,completed")
          .eq("user_id", uid),
      );
      const done = new Set(
        own.filter((p) => p.completed).map((p) => p.lesson_id),
      );
      let lesson = lessons.find((l) => l.id === b.lessonId);
      if (admin && !lesson)
        lesson = checked(
          await db.from("lessons").select("*").eq("id", b.lessonId).single(),
        );
      if (
        !lesson ||
        (!admin &&
          !done.has(lesson.id) &&
          !lessons
            .slice(
              0,
              lessons.findIndex((l) => l.id === lesson.id),
            )
            .every((l) => done.has(l.id)))
      )
        return NextResponse.json(
          { error: "Conclua as aulas anteriores para acessar esta aula." },
          { status: 403 },
        );
      if (b.action === "progress") {
        if (!Number.isFinite(b.start) || !Number.isFinite(b.end))
          throw Error("Progresso inválido.");
        const completed = checked(
          await db.rpc("record_progress", {
            p_user: uid,
            p_lesson: lesson.id,
            p_session: b.sessionId,
            p_start: b.start,
            p_end: b.end,
          }),
        );
        return NextResponse.json({ completed });
      }
      if (lesson.status !== "ready" || !lesson.playback_id)
        throw Error("O vídeo desta aula ainda não está pronto.");
      const token = await mux().jwt.signPlaybackId(lesson.playback_id, {
        keyId: process.env.MUX_SIGNING_KEY,
        keySecret: process.env.MUX_PRIVATE_KEY,
        expiration: "4h",
        type: "video",
      });
      const session = checked(
        await db
          .from("playback_sessions")
          .insert({ user_id: uid, lesson_id: lesson.id })
          .select("id")
          .single(),
      );
      return NextResponse.json({ token, sessionId: session.id });
    }
    if (!admin)
      return NextResponse.json(
        { error: "Acesso restrito à administração." },
        { status: 403 },
      );
    if (b.action === "saveModule") {
      if (
        typeof b.name !== "string" ||
        !b.name.trim() ||
        typeof b.title !== "string" ||
        !b.title.trim() ||
        !Number.isInteger(b.position) ||
        b.position < 0
      )
        throw Error("Preencha nome, título e posição.");
      const fields = {
        name: b.name.slice(0, 100),
        title: b.title.slice(0, 150),
        subtitle: String(b.subtitle || "").slice(0, 200),
        position: b.position,
        image: String(b.image || "/images/inicio.jpg"),
      };
      const q = b.id
        ? db.from("modules").update(fields).eq("id", b.id)
        : db.from("modules").insert(fields);
      return NextResponse.json(checked(await q.select().single()));
    }
    if (b.action === "fileUpload") {
      const material = b.material === true;
      const types = material
        ? ["application/pdf"]
        : ["image/png", "image/jpeg", "image/webp"];
      if (!types.includes(b.contentType))
        throw Error("Formato de arquivo não permitido.");
      const bucket = material ? "materials" : "covers";
      const ext = material ? "pdf" : b.contentType.split("/")[1];
      const path = crypto.randomUUID() + "." + ext;
      const signed = checked(
        await db.storage.from(bucket).createSignedUploadUrl(path),
      );
      return NextResponse.json({
        bucket,
        path,
        token: signed.token,
        publicUrl: material
          ? undefined
          : db.storage.from(bucket).getPublicUrl(path).data.publicUrl,
      });
    }
    if (b.action === "members") {
      const members = checked(
        await db
          .from("profiles")
          .select("id,email,name,suspended")
          .order("name"),
      );
      const progress = checked(
        await db.from("progress").select("user_id").eq("completed", true),
      );
      return NextResponse.json({
        members: members.map((m) => ({
          ...m,
          completed_count: progress.filter((p) => p.user_id === m.id).length,
        })),
      });
    }
    if (b.action === "invite") {
      if (typeof b.email !== "string" || !b.email.includes("@"))
        throw Error("Informe um e-mail válido.");
      const r = await db.auth.admin.inviteUserByEmail(b.email, {
        data: { name: String(b.name || "").slice(0, 150) },
        redirectTo:
          (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000") +
          "/?setup=1",
      });
      if (r.error) throw r.error;
      return NextResponse.json({ ok: true });
    }
    if (b.action === "suspend") {
      if (b.id === uid)
        throw Error("Você não pode suspender o próprio acesso.");
      checked(
        await db
          .from("profiles")
          .update({ suspended: Boolean(b.suspended) })
          .eq("id", b.id),
      );
      return NextResponse.json({ ok: true });
    }
    if (b.action === "saveLesson") {
      if (
        typeof b.title !== "string" ||
        !b.title.trim() ||
        !modules.some((m) => m.id === b.module) ||
        !Number.isInteger(b.position) ||
        b.position < 0
      )
        throw Error("Preencha título, módulo e posição corretamente.");
      const fields = {
        title: b.title.trim().slice(0, 200),
        module: b.module,
        description: String(b.description || "").slice(0, 10000),
        position: b.position,
        ...(typeof b.material_path === "string"
          ? { material_path: b.material_path }
          : {}),
      };
      const result = b.id
        ? db.from("lessons").update(fields).eq("id", b.id)
        : db.from("lessons").insert(fields);
      return NextResponse.json(checked(await result.select().single()));
    }
    if (b.action === "publish") {
      const l = checked(
        await db.from("lessons").select("status").eq("id", b.lessonId).single(),
      );
      if (b.published && l.status !== "ready")
        throw Error("Aguarde o processamento do vídeo antes de publicar.");
      checked(
        await db
          .from("lessons")
          .update({ published: Boolean(b.published) })
          .eq("id", b.lessonId),
      );
      return NextResponse.json({ ok: true });
    }
    if (b.action === "upload") {
      const lesson = checked(
        await db
          .from("lessons")
          .select("id,published")
          .eq("id", b.lessonId)
          .single(),
      );
      if (lesson.published)
        throw Error("Despublique a aula antes de substituir o vídeo.");
      const upload = await mux().video.uploads.create({
        cors_origin:
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        new_asset_settings: {
          playback_policy: ["signed"],
          passthrough: lesson.id,
          video_quality: "basic",
        },
      });
      checked(
        await db
          .from("lessons")
          .update({ upload_id: upload.id, status: "processing" })
          .eq("id", lesson.id),
      );
      return NextResponse.json({ url: upload.url });
    }
    return NextResponse.json(
      { error: "Operação desconhecida." },
      { status: 400 },
    );
  } catch (e) {
    console.error("[platform]", (e as Error).message);
    return NextResponse.json(
      {
        error:
          (e as Error).message || "Não foi possível concluir esta operação.",
      },
      { status: 400 },
    );
  }
}
