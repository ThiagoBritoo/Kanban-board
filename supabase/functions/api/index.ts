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

// task + checagem de acesso (leitura com service role: só devolve se a pessoa é membro do projeto)
async function taskFor(uid: string, id: unknown) {
  const { data: t } = await sb.from("tasks").select("*, board_columns(name,kind)").eq("id", Number(id)).is("deleted_at", null).maybeSingle();
  if (!t) throw new Error("Task não encontrada");
  const { data: m } = await sb.from("project_members").select("user_id").eq("project_id", t.project_id).eq("user_id", uid).maybeSingle();
  if (!m) throw new Error("Task não encontrada");
  return t as any;
}
const PRIO_NAME = ["baixa", "normal", "alta", "urgente"];
const clView = (cl: any[]) => (cl ?? []).map((i: any, n: number) => ({ n: n + 1, done: !!i.done, text: i.text }));
const clCount = (cl: any[]) => ({ done: (cl ?? []).filter((i: any) => i.done).length, total: (cl ?? []).length });
async function update(uid: string, id: number, patch: Record<string, unknown>) {
  const { error } = await sb.rpc("api_update_task", { p_user: uid, p_task: id, p_patch: patch });
  if (error) throw new Error(/api_update_task/.test(error.message) ? "Falta aplicar a migração 0009 (supabase/migrations/0009_api_editar_task.sql)" : error.message);
}
// índices do checklist: aceita 3, "3", [1,2], "1,2,5" ou "2-4" (base 1)
function idxList(v: unknown, max: number): number[] {
  const parts = Array.isArray(v) ? v.map(String) : String(v ?? "").split(",");
  const out = new Set<number>();
  for (const p of parts) {
    const m = p.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/); if (!m) continue;
    const a = Number(m[1]), b = Number(m[2] ?? m[1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) out.add(i - 1);
  }
  if (!out.size) throw new Error(`Informe itens válidos do checklist (1 a ${max})`);
  return [...out].sort((x, y) => x - y);
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
        let q = sb.from("tasks").select("id,title,priority,due_date,labels,checklist,column_id,board_columns(name,kind)").eq("project_id", p.id).is("deleted_at", null).order("id", { ascending: false }).limit(Math.min(Number(b.limit) || 30, 100));
        if (col) q = q.eq("column_id", col.id);
        const { data, error } = await q; if (error) throw new Error(error.message);
        return json({ project: p.name, tasks: (data ?? []).map((t: any) => ({ id: t.id, title: t.title, status: t.board_columns?.name, priority: PRIO_NAME[t.priority] ?? t.priority, due_date: t.due_date, labels: t.labels, checklist: clCount(t.checklist) })) });
      }
      case "get_task": {
        const t = await taskFor(uid, b.task_id);
        const [{ data: proj }, { data: ev }, { data: who }] = await Promise.all([
          sb.from("projects").select("name").eq("id", t.project_id).maybeSingle(),
          sb.from("events").select("type,data,at,profiles(name)").eq("task_id", t.id).eq("type", "comment").order("at", { ascending: false }).limit(30),
          t.assignee_id ? sb.from("profiles").select("name").eq("id", t.assignee_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        return json({ id: t.id, title: t.title, project: proj?.name, status: t.board_columns?.name, kind: t.board_columns?.kind, priority: PRIO_NAME[t.priority],
          due_date: t.due_date, labels: t.labels, assignee: (who as any)?.name ?? null, description: t.description, notes: t.notes, diary: t.diary,
          checklist: clView(t.checklist), checklist_count: clCount(t.checklist), started_at: t.started_at, finished_at: t.finished_at, created_at: t.created_at,
          comments: (ev ?? []).reverse().map((e: any) => ({ by: e.profiles?.name, at: e.at, text: e.data?.text })) });
      }
      case "update_task": {
        const t = await taskFor(uid, b.task_id);
        const patch: Record<string, unknown> = {};
        for (const k of ["title", "description", "notes", "diary", "due_date", "labels"]) if (b[k] !== undefined) patch[k] = b[k];
        if (b.priority !== undefined) patch.priority = typeof b.priority === "number" ? b.priority : PRIO[norm(b.priority)] ?? 1;
        if (!Object.keys(patch).length) throw new Error("Nada para mudar (use title, description, notes, diary, priority, due_date, labels)");
        await update(uid, t.id, patch);
        return json({ ok: true, changed: Object.keys(patch) });
      }
      case "checklist": {
        const t = await taskFor(uid, b.task_id);
        const cl: { text: string; done: boolean }[] = (t.checklist ?? []).map((i: any) => ({ text: String(i.text ?? ""), done: !!i.done }));
        const texts = (v: unknown) => (Array.isArray(v) ? v : [v]).map((x) => String(x ?? "").trim()).filter(Boolean);
        const op = norm(b.op);
        if (op === "add") {
          const add = texts(b.items ?? b.text); if (!add.length) throw new Error("Informe items (lista de textos)");
          const at = b.position ? Math.max(0, Math.min(cl.length, Number(b.position) - 1)) : cl.length;
          cl.splice(at, 0, ...add.map((text) => ({ text, done: false })));
        } else if (op === "check" || op === "uncheck" || op === "toggle") {
          for (const i of idxList(b.items ?? b.index, cl.length)) cl[i].done = op === "toggle" ? !cl[i].done : op === "check";
        } else if (op === "edit") {
          const [i] = idxList(b.index, cl.length); const tx = texts(b.text)[0]; if (!tx) throw new Error("Informe text");
          cl[i].text = tx;
        } else if (op === "remove") {
          const del = new Set(idxList(b.items ?? b.index, cl.length));
          cl.splice(0, cl.length, ...cl.filter((_, i) => !del.has(i)));
        } else if (op === "merge") {
          // junta vários itens num só (no lugar do primeiro); fica feito só se todos estavam feitos
          const ids = idxList(b.items ?? b.index, cl.length); if (ids.length < 2) throw new Error("merge precisa de 2 ou mais itens");
          const tx = texts(b.text)[0] ?? ids.map((i) => cl[i].text).join(" — ");
          const done = ids.every((i) => cl[i].done), drop = new Set(ids.slice(1));
          cl[ids[0]] = { text: tx, done };
          cl.splice(0, cl.length, ...cl.filter((_, i) => !drop.has(i)));
        } else if (op === "move") {
          const [i] = idxList(b.index, cl.length); const to = Math.max(1, Math.min(cl.length, Number(b.position) || 1)) - 1;
          const [it] = cl.splice(i, 1); cl.splice(to, 0, it);
        } else if (op === "replace") {
          if (!Array.isArray(b.items)) throw new Error('replace precisa de items: [{text, done}] ou ["texto"]');
          cl.splice(0, cl.length, ...b.items.map((x: any) => typeof x === "string" ? { text: x, done: false } : { text: String(x?.text ?? ""), done: !!x?.done }).filter((x: any) => x.text.trim()));
        } else throw new Error("op inválida. Use: add, check, uncheck, toggle, edit, remove, merge, move, replace");
        if (cl.length > 300) throw new Error("Checklist passa de 300 itens");
        await update(uid, t.id, { checklist: cl });
        return json({ ok: true, checklist: clView(cl), checklist_count: clCount(cl) });
      }
      case "search": {
        const q = String(b.query ?? "").trim(); if (!q) throw new Error("Informe query");
        const ids = b.project ? [(await pickProject(uid, b.project)).id] : (await userProjects(uid)).map((p) => p.id);
        const like = `%${q.replace(/[%_,()*]/g, " ")}%`;
        const { data, error } = await sb.from("tasks").select("id,title,project_id,board_columns(name)").in("project_id", ids).is("deleted_at", null)
          .or(`title.ilike.${like},description.ilike.${like},notes.ilike.${like}`).order("id", { ascending: false }).limit(Math.min(Number(b.limit) || 20, 50));
        if (error) throw new Error(error.message);
        return json({ tasks: (data ?? []).map((t: any) => ({ id: t.id, title: t.title, status: t.board_columns?.name, project_id: t.project_id })) });
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
      default: return json({ error: "action desconhecida. Use: projects, create_task, list_tasks, get_task, update_task, checklist, search, move_task, comment" }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
