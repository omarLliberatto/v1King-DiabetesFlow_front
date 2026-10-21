import { createClient } from "@supabase/supabase-js";
import { db, KINDS, SYNCED_EVENT, TABLE_BY_KIND, type Kind } from "./db";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

interface RemoteRecord {
  kind: Kind;
  id: string;
  data: Record<string, unknown>;
  deleted: boolean;
  updated_at: string;
}

const PAGE = 1000;
const OVERLAP_MS = 60_000;

let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export function requestSync(): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    syncNow().catch(console.error);
  }, 500);
}

export function syncNow(): Promise<void> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await push(userId);
  const pulled = await pull(userId);
  const at = new Date().toISOString();
  await db.meta.put({ key: `lastSync:${userId}`, value: at });
  window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: { at, pulled } }));
}

async function push(userId: string): Promise<void> {
  const sent: { kind: Kind; row: Record<string, unknown> }[] = [];
  for (const kind of KINDS) {
    const rows = await db.table(TABLE_BY_KIND[kind]).where("dirty").equals(1).toArray();
    for (const row of rows) sent.push({ kind, row });
  }
  const tombstones = await db.tombstones.toArray();
  if (sent.length === 0 && tombstones.length === 0) return;

  const records = [
    ...sent.map(({ kind, row }) => {
      const { dirty: _dirty, ...rest } = row;
      return { user_id: userId, kind, id: String(row.id), data: rest, deleted: false };
    }),
    ...tombstones.map((t) => ({ user_id: userId, kind: t.kind, id: t.id, data: {}, deleted: true })),
  ];
  const { error } = await supabase!.from("records").upsert(records, { onConflict: "user_id,kind,id" });
  if (error) throw error;

  await db.transaction("rw", [...KINDS.map((k) => db.table(TABLE_BY_KIND[k])), db.tombstones], async () => {
    for (const { kind, row } of sent) {
      const table = db.table(TABLE_BY_KIND[kind]);
      const current = await table.get(row.id as string);
      if (current && JSON.stringify(current) === JSON.stringify(row)) await table.update(row.id as string, { dirty: undefined });
    }
    await db.tombstones.bulkDelete(tombstones.map((t) => t.key));
  });
}

async function pull(userId: string): Promise<number> {
  const cursorKey = `cursor:${userId}`;
  const cursor = (await db.meta.get(cursorKey))?.value;
  const since = cursor ? new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString() : null;
  let latest = cursor ?? "";
  let applied = 0;

  for (let from = 0; ; from += PAGE) {
    let query = supabase!.from("records").select("kind,id,data,deleted,updated_at").order("updated_at").range(from, from + PAGE - 1);
    if (since) query = query.gt("updated_at", since);
    const { data, error } = await query;
    if (error) throw error;
    const records = (data ?? []) as RemoteRecord[];

    await db.transaction("rw", KINDS.map((k) => db.table(TABLE_BY_KIND[k])), async () => {
      for (const r of records) {
        const table = db.table(TABLE_BY_KIND[r.kind]);
        const local = await table.get(r.id);
        if (local?.dirty) continue;
        if (r.deleted) {
          if (local) {
            await table.delete(r.id);
            applied++;
          }
          continue;
        }
        const next = { ...r.data, id: r.id };
        if (!local || JSON.stringify(local) !== JSON.stringify(next)) {
          await table.put(next);
          applied++;
        }
      }
    });

    for (const r of records) if (r.updated_at > latest) latest = r.updated_at;
    if (records.length < PAGE) break;
  }

  if (latest) await db.meta.put({ key: cursorKey, value: latest });
  return applied;
}

export async function getLastSync(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  return userId ? (await db.meta.get(`lastSync:${userId}`))?.value : undefined;
}
