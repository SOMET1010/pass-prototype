-- Informations pratiques des centres de retrait
alter table point_retrait add column adresse text;
alter table point_retrait add column telephone text;
alter table point_retrait add column gestionnaire text;

drop view if exists v_stock_points;
create view v_stock_points as
select p.id_point, p.libelle, p.zone, p.actif, p.adresse, p.telephone, p.gestionnaire,
       count(t.id_terminal) filter (where t.statut = 'en_stock') as stock,
       count(t.id_terminal) filter (where t.statut = 'remis') as remis
from point_retrait p
left join terminal t on t.id_point_retrait = p.id_point
group by p.id_point, p.libelle, p.zone, p.actif, p.adresse, p.telephone, p.gestionnaire;
grant select on v_stock_points to authenticated;
