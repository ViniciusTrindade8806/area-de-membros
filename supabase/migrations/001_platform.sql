create table public.profiles (id uuid primary key references auth.users on delete cascade, email text not null, name text not null default '', role text not null default 'student' check (role in ('student','admin')), suspended boolean not null default false);
create table public.lessons (id uuid primary key default gen_random_uuid(), module text not null, title text not null, description text not null default '', position integer not null default 0, duration double precision not null default 0, published boolean not null default false, status text not null default 'draft', asset_id text, upload_id text, playback_id text, material_url text);
create table public.progress (user_id uuid references public.profiles on delete cascade, lesson_id uuid references public.lessons on delete cascade, intervals jsonb not null default '[]', position double precision not null default 0, completed boolean not null default false, primary key(user_id,lesson_id));
create table public.playback_sessions (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles on delete cascade, lesson_id uuid references public.lessons on delete cascade, created_at timestamptz not null default now(), last_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.progress enable row level security;
alter table public.playback_sessions enable row level security;
-- Writes use authenticated server endpoints with a service-role client. No browser write grants.
revoke all on public.profiles, public.lessons, public.progress, public.playback_sessions from anon, authenticated;
grant all on public.profiles, public.lessons, public.progress, public.playback_sessions to service_role;
create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,email,name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',''));return new;end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
-- Serialize progress updates per account and lesson. Replayed or parallel intervals never count twice.
create or replace function public.record_progress(p_user uuid,p_lesson uuid,p_session uuid,p_start double precision,p_end double precision) returns boolean language plpgsql security definer set search_path=public as $$
declare s public.playback_sessions; l public.lessons; existing jsonb; merged jsonb; total double precision; done boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_lesson::text,0));
 select * into s from public.playback_sessions where id=p_session and user_id=p_user and lesson_id=p_lesson for update;
 if not found or s.created_at < now()-interval '4 hours' then raise exception 'Sessão expirada. Abra a aula novamente.'; end if;
 select * into l from public.lessons where id=p_lesson;
 if p_start<0 or p_end<=p_start or p_end>l.duration+1 or p_end-p_start>16 or p_end-p_start>extract(epoch from now()-s.last_at)*2.1+2 then raise exception 'Intervalo de progresso inválido.'; end if;
 insert into public.progress(user_id,lesson_id) values(p_user,p_lesson) on conflict do nothing;
 select intervals,completed into existing,done from public.progress where user_id=p_user and lesson_id=p_lesson for update;
 with spans as (select (value->>0)::float8 a,(value->>1)::float8 b from jsonb_array_elements(existing||jsonb_build_array(jsonb_build_array(p_start,least(p_end,l.duration))))), running as (select *,max(b) over(order by a,b rows between unbounded preceding and 1 preceding) prev from spans), groups as (select *,sum(case when prev is null or a>prev then 1 else 0 end) over(order by a,b) g from running), combined as (select min(a) a,max(b) b from groups group by g) select coalesce(jsonb_agg(jsonb_build_array(a,b) order by a),'[]'),coalesce(sum(b-a),0) into merged,total from combined;
 done:=done or (l.duration>0 and total/l.duration>=0.9);
 update public.progress set intervals=merged,position=least(p_end,l.duration),completed=done where user_id=p_user and lesson_id=p_lesson;
 update public.playback_sessions set last_at=now() where id=p_session;
 return done;
end; $$;
revoke all on function public.record_progress(uuid,uuid,uuid,double precision,double precision) from public,anon,authenticated;
grant execute on function public.record_progress(uuid,uuid,uuid,double precision,double precision) to service_role;
