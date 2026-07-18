-- Module de stock : points de retrait et rattachement du stock terminal
create table point_retrait (
  id_point   uuid primary key default gen_random_uuid(),
  libelle    text not null,
  zone       text not null,
  actif      boolean not null default true
);

alter table terminal add column id_point_retrait uuid references point_retrait(id_point);

alter table point_retrait enable row level security;
create policy sel_point on point_retrait for select to authenticated using (is_active_agent());

create index idx_terminal_point on terminal(id_point_retrait);

create or replace view v_stock_points as
select p.id_point, p.libelle, p.zone, p.actif,
       count(t.id_terminal) filter (where t.statut = 'en_stock') as stock,
       count(t.id_terminal) filter (where t.statut = 'remis') as remis
from point_retrait p
left join terminal t on t.id_point_retrait = p.id_point
group by p.id_point, p.libelle, p.zone, p.actif;

grant select on v_stock_points to authenticated;
