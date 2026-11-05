// Função de borda "api": deixa uma ferramenta de fora (ex.: IA no VS Code) criar/mover/comentar tasks com um token pessoal.
// O token (kb_...) é gerado em Personalizar → Conta; aqui só guardamos o hash. As escritas passam pelas funções api_* do banco,
// que checam se a pessoa é membro do projeto e registram tudo em nome dela. verify_jwt = false (a autenticação é o token).
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const norm = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const PRIO: Record<string, number> = { baixa: 0, normal: 1, alta: 2, urgente: 3 };

async function userProjects(uid: string) {
  const { data } = await sb.from("project_members").select("project_id, role, projects(id,name)").eq("user_id", uid);
  return (data ?? []).map((m: any) => ({ id: m.projects.id as number, name: m.projects.name as string, role: m.role as string }));
}
async function pickProject(uid: string, ref: unknown) {
  const list = await userProjects(uid);
  if (!list.length) throw new Error("Você não participa de nenhum projeto");
  if (ref == null || ref === "") {
    if (list.length === 1) return list[0];
    throw new Error("Informe o projeto. Opções: " + list.map((p) => p.name).join(", "));
  }
  const q = norm(String(ref));
  const hit = list.find((p) => String(p.id) === q) ?? list.find((p) => norm(p.name) === q) ?? list.find((p) => norm(p.name).includes(q));
  if (!hit) throw new Error(`Projeto "${ref}" não encontrado. Opções: ` + list.map((p) => p.name).join(", "));
  return hit;
}
async function pickColumn(projectId: number, ref: unknown) {
  const { data } = await sb.from("board_columns").select("id,name,kind").eq("project_id", projectId).order("position");
  const cols = data ?? [];
  if (ref == null || ref === "") return null;
  const q = norm(String(ref));
  const hit = cols.find((c: any) => String(c.id) === q) ?? cols.find((c: any) => norm(c.name) === q) ?? cols.find((c: any) => norm(c.name).includes(q))
    ?? (["todo", "a fazer", "afazer"].includes(q) ? cols.find((c: any) => c.kind === "todo") : ["doing", "andamento", "em andamento", "desenvolvimento"].includes(q) ? cols.find((c: any) => c.kind === "doing") : ["done", "concluida", "concluido", "pronto"].includes(q) ? cols.find((c: any) => c.kind === "done") : undefined);
  if (!hit) throw new Error(`Coluna "${ref}" não encontrada. Opções: ` + cols.map((c: any) => c.name).join(", "));
  return hit as { id: number; name: string; kind: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!/^kb_[0-9a-f]{48}$/.test(token)) return json({ error: "Token ausente ou inválido" }, 401);
  const hash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const { data: tk } = await sb.from("api_tokens").select("id,user_id").eq("token_hash", hash).maybeSingle();
  if (!tk) return json({ error: "Token ausente ou inválido" }, 401);
  sb.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tk.id).then(() => {});
  const uid = tk.user_id as string;
  let b: any = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }

  try {
    switch (b.action) {
      case "projects": {
        const out = [];
        for (const p of await userProjects(uid)) {
          const { data: cols } = await sb.from("board_columns").select("id,name,kind").eq("project_id", p.id).order("position");
          out.push({ ...p, columns: cols ?? [] });
        }
        return json({ projects: out });
      }
      case "create_task": {
        if (!String(b.title ?? "").trim()) throw new Error("title é obrigatório");
        const p = await pickProject(uid, b.project);
        const col = await pickColumn(p.id, b.column);
        const prio = typeof b.priority === "number" ? b.priority : PRIO[norm(b.priority ?? "normal")] ?? 1;
        const { data, error } = await sb.rpc("api_create_task", {
          p_user: uid, p_project: p.id, p_column: col?.id ?? null, p_title: String(b.title), p_description: String(b.description ?? ""),
          p_priority: prio, p_due: b.due_date || null, p_labels: Array.isArray(b.labels) ? b.labels.map(String) : [], p_notes: String(b.notes ?? ""),
        });
        if (error) throw new Error(error.message);
        return json({ ok: true, task_id: data, project: p.name, column: col?.name ?? "(primeira coluna A fazer)" });
      }
      case "list_tasks": {
        const p = await pickProject(uid, b.project);
        const col = await pickColumn(p.id, b.column);
        let q = sb.from("tasks").select("id,title,priority,due_date,column_id,board_columns(name,kind)").eq("project_id", p.id).is("deleted_at", null).order("id", { ascending: false }).limit(Math.min(Number(b.limit) || 30, 100));
        if (col) q = q.eq("column_id", col.id);
        const { data, error } = await q; if (error) throw new Error(error.message);
        return json({ project: p.name, tasks: (data ?? []).map((t: any) => ({ id: t.id, title: t.title, status: t.board_columns?.name, priority: t.priority, due_date: t.due_date })) });
      }
      case "move_task": {
        const { data: t } = await sb.from("tasks").select("project_id").eq("id", Number(b.task_id)).maybeSingle();
        if (!t) throw new Error("Task não encontrada");
        const col = await pickColumn(t.project_id, b.column); if (!col) throw new Error("column é obrigatório");
        const { error } = await sb.rpc("api_move_task", { p_user: uid, p_task: Number(b.task_id), p_column: col.id });
        if (error) throw new Error(error.message);
        return json({ ok: true, column: col.name });
      }
      case "comment": {
        const { error } = await sb.rpc("api_comment", { p_user: uid, p_task: Number(b.task_id), p_text: String(b.text ?? "") });
        if (error) throw new Error(error.message);
        return json({ ok: true });
      }
      default: return json({ error: "action desconhecida. Use: projects, create_task, list_tasks, move_task, comment" }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
