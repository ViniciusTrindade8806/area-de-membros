"use client";
import { useState } from "react";
import { Lesson, Module } from "@/lib/course";
import { supabase } from "@/lib/supabase";
type Props = {
  modules: Module[];
  lessons: Lesson[];
  api: (action: string, data?: Record<string, unknown>) => Promise<any>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  enabled: boolean;
};
export default function ContentEditor({
  modules,
  lessons,
  api,
  refresh,
  notify,
  enabled,
}: Props) {
  const [kind, setKind] = useState("module"),
    [id, setId] = useState(""),
    [busy, setBusy] = useState(false);
  const selected =
    kind === "module"
      ? modules.find((m) => m.id === id)
      : lessons.find((l) => l.id === id);
  async function upload(file: File, material: boolean) {
    const d = await api("fileUpload", {
      filename: file.name,
      contentType: file.type,
      material,
    });
    const { error } = await supabase!.storage
      .from(d.bucket)
      .uploadToSignedUrl(d.path, d.token, file);
    if (error) throw error;
    return d.publicUrl || d.path;
  }
  return (
    <details className="editor">
      <summary>Editar módulos, capas e aulas</summary>
      <div className="form-grid">
        <label>
          Tipo
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setId("");
            }}
          >
            <option value="module">Módulo</option>
            <option value="lesson">Aula</option>
          </select>
        </label>
        <label>
          Selecionar
          <select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">
              {kind === "module" ? "Criar novo módulo" : "Selecione uma aula"}
            </option>
            {(kind === "module" ? modules : lessons).map((item) => (
              <option key={item.id} value={item.id}>
                {"name" in item ? item.name : item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(kind === "module" || id) && (
        <form
          key={kind + id}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!enabled)
              return notify("Conecte os serviços para editar o conteúdo.");
            setBusy(true);
            const f = new FormData(e.currentTarget);
            try {
              if (kind === "module") {
                const cover = f.get("cover") as File;
                const image = cover?.size
                  ? await upload(cover, false)
                  : (selected as Module)?.image;
                await api("saveModule", {
                  id: id || undefined,
                  name: f.get("name"),
                  title: f.get("title"),
                  subtitle: f.get("subtitle"),
                  position: Number(f.get("position")),
                  image,
                });
              } else {
                const material = f.get("material") as File;
                const material_path = material?.size
                  ? await upload(material, true)
                  : undefined;
                await api("saveLesson", {
                  id,
                  title: f.get("title"),
                  description: f.get("description"),
                  module: f.get("module"),
                  position: Number(f.get("position")),
                  material_path,
                });
              }
              await refresh();
              notify("Conteúdo atualizado.");
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {kind === "module" ? (
            <>
              <label>
                Nome do módulo
                <input
                  name="name"
                  defaultValue={(selected as Module)?.name}
                  required
                />
              </label>
              <label>
                Título da capa
                <input name="title" defaultValue={selected?.title} required />
              </label>
              <label>
                Descrição curta
                <input
                  name="subtitle"
                  defaultValue={(selected as Module)?.subtitle}
                />
              </label>
              <label>
                Capa (JPG, PNG ou WebP)
                <input
                  name="cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Título
                <input name="title" defaultValue={selected?.title} required />
              </label>
              <label>
                Descrição
                <textarea
                  name="description"
                  defaultValue={(selected as Lesson)?.description}
                />
              </label>
              <label>
                Módulo
                <select
                  name="module"
                  defaultValue={(selected as Lesson)?.module}
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Material de apoio (PDF)
                <input type="file" name="material" accept="application/pdf" />
              </label>
            </>
          )}
          <label>
            Posição
            <input
              type="number"
              name="position"
              min={0}
              defaultValue={selected?.position || 0}
              required
            />
          </label>
          <button disabled={busy} className="primary">
            {busy ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      )}
    </details>
  );
}
