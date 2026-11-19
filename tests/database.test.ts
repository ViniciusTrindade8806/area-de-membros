import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("SQL migrations and actual progress RPC preserve unique coverage and permissions", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  for (const f of ["001_platform.sql", "002_modules_storage.sql"])
    await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
  const user = "00000000-0000-0000-0000-000000000001",
    lesson = "00000000-0000-0000-0000-000000000002",
    session = "00000000-0000-0000-0000-000000000003";
  await db.query(
    `insert into auth.users values($1,'aluno@example.test','{}')`,
    [user],
  );
  await db.query(
    `insert into public.lessons(id,module,title,duration,status,published) values($1,'inicio','Teste',100,'ready',true)`,
    [lesson],
  );
  await db.query(
    `insert into public.playback_sessions(id,user_id,lesson_id) values($1,$2,$3)`,
    [session, user, lesson],
  );
  const record = async (a: number, b: number) => {
    await db.query(
      `update playback_sessions set last_at=now()-interval '10 seconds' where id=$1`,
      [session],
    );
    return db.query<{ done: boolean }>(
      `select record_progress($1,$2,$3,$4,$5) done`,
      [user, lesson, session, a, b],
    );
  };
  assert.equal((await record(0, 10)).rows[0].done, false);
  await record(0, 10);
  await record(90, 100);
  let p = await db.query<{ intervals: number[][]; completed: boolean }>(
    "select intervals,completed from progress",
  );
  assert.deepEqual(p.rows[0].intervals, [
    [0, 10],
    [90, 100],
  ]);
  assert.equal(p.rows[0].completed, false);
  for (let a = 10; a < 80; a += 10) await record(a, a + 10);
  assert.equal(
    (await db.query<{ completed: boolean }>("select completed from progress"))
      .rows[0].completed,
    true,
  );
  await assert.rejects(() => record(10, 90));
  await db.exec("set role authenticated");
  await assert.rejects(() => db.query("select * from progress"));
  await assert.rejects(() =>
    db.query(`select record_progress($1,$2,$3,0,10)`, [user, lesson, session]),
  );
  await db.close();
});
