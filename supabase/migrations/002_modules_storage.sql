create table public.modules (id text primary key default gen_random_uuid()::text, name text not null, title text not null, subtitle text not null default '', image text not null default '', color text not null default '#510787', position integer not null default 0);
alter table public.modules enable row level security;
revoke all on public.modules from anon, authenticated;
grant all on public.modules to service_role;
insert into public.modules(id,name,title,subtitle,image,position) values
('inicio','Comece por aqui','Seu próximo destino começa aqui','Conheça a sua jornada','/images/inicio.jpg',0),
('emocional','Inteligência emocional','No controle da sua melhor versão','Equilíbrio dentro e fora do carro','/images/emocional.jpg',1),
('financas','Finanças na prática','Faça cada quilômetro valer mais','Organize hoje. Vá mais longe amanhã.','/images/financas.jpg',2),
('vistoria','Vistorias e cuidados','Cuidado que acompanha você','Seu carro pronto para a próxima corrida','/images/vistoria.jpg',3);
alter table public.lessons add constraint lessons_module_fk foreign key(module) references public.modules(id);
alter table public.lessons add column material_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('covers','covers',true,10485760,array['image/jpeg','image/png','image/webp']),('materials','materials',false,20971520,array['application/pdf']) on conflict do nothing;
