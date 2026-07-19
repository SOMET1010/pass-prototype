-- ===== SCÉNARIO DE DÉMONSTRATION ENRICHI (optionnel) =====
-- À exécuter APRÈS seed.sql et les migrations. Données fictives, dates relatives à now().
-- Crée des points de retrait, ~28 bénéficiaires répartis sur 5 zones et 7 jours,
-- avec tous les états (remis, activés, validés, refusés, à instruire, soumis).

-- Points de retrait
insert into point_retrait (id_point, libelle, zone, actif) values
 ('88888888-8888-8888-8888-000000000001','Centre PASS Abidjan — Plateau','Abidjan',true),
 ('88888888-8888-8888-8888-000000000002','Centre PASS Abidjan — Yopougon','Abidjan',true),
 ('88888888-8888-8888-8888-000000000003','Centre PASS Bouaké','Bouaké',true),
 ('88888888-8888-8888-8888-000000000004','Centre PASS Korhogo','Korhogo',true),
 ('88888888-8888-8888-8888-000000000005','Centre PASS Man','Man',true),
 ('88888888-8888-8888-8888-000000000006','Centre PASS Odienné','Odienné',true);

do $$
declare
  ENROL uuid := '11111111-1111-1111-1111-111111110001';
  INSTR uuid := '11111111-1111-1111-1111-111111110002';
  REM   uuid := '11111111-1111-1111-1111-111111110003';
  CAMP  uuid := '44444444-4444-4444-4444-444444442026';
  rec record; v_pers uuid; v_dem uuid; v_term uuid; v_dist uuid; i int := 0;
begin
  insert into terminal (modele, imei, statut)
  select (array['Tecno Spark 20C','itel P55','Samsung Galaxy A05','Nokia C32'])[1 + (g % 4)],
         '3570000' || lpad(g::text,6,'0'), 'en_stock'
  from generate_series(1,40) g;

  for rec in
    select * from (values
      ('CI-900-001','KOUADIO','Yao','Abidjan',0,'remis_active'),
      ('CI-900-002','N''DRI','Ama','Abidjan',0,'remis_active'),
      ('CI-900-003','ADOU','Koffi','Abidjan',1,'remis_active'),
      ('CI-900-004','ASSI','Adjoua','Abidjan',3,'remis_active'),
      ('CI-900-005','BROU','Kan','Abidjan',2,'remis'),
      ('CI-900-006','YAPI','Ama','Abidjan',4,'valide'),
      ('CI-900-007','TANO','Yao','Abidjan',1,'refuse'),
      ('CI-900-008','EBROTTIE','Marie','Abidjan',0,'soumise'),
      ('CI-900-009','KONE','Salif','Bouaké',0,'remis_active'),
      ('CI-900-010','OUATTARA','Awa','Bouaké',2,'remis_active'),
      ('CI-900-011','BAMBA','Ali','Bouaké',3,'remis'),
      ('CI-900-012','DIABATE','Mariam','Bouaké',5,'valide'),
      ('CI-900-013','SANOGO','Ibrahim','Bouaké',4,'instruire'),
      ('CI-900-014','COULIBALY','Fanta','Bouaké',2,'refuse'),
      ('CI-900-015','SORO','Nabintou','Korhogo',0,'remis_active'),
      ('CI-900-016','SILUE','Yeo','Korhogo',1,'remis_active'),
      ('CI-900-017','COULIBALY','Adama','Korhogo',3,'remis'),
      ('CI-900-018','TUO','Pega','Korhogo',5,'remis'),
      ('CI-900-019','OUATTARA','Sita','Korhogo',2,'valide'),
      ('CI-900-020','YEO','Navigue','Korhogo',4,'instruire'),
      ('CI-900-021','GBAKA','Trokon','Man',1,'remis_active'),
      ('CI-900-022','ZALE','Marcelline','Man',3,'remis'),
      ('CI-900-023','GUEU','Dje','Man',6,'instruire'),
      ('CI-900-024','DION','Gnizan','Man',0,'soumise'),
      ('CI-900-025','CISSE','Moussa','Odienné',2,'remis_active'),
      ('CI-900-026','TRAORE','Aminata','Odienné',4,'remis'),
      ('CI-900-027','DIALLO','Oumar','Odienné',5,'valide'),
      ('CI-900-028','KEITA','Fatoumata','Odienné',3,'refuse')
    ) as t(cni,nom,prenom,zone,days_ago,etat)
  loop
    i := i + 1;
    insert into personne(numero_cni,nom,prenoms,date_naissance,zone_residence,statut_verif_identite,profil_demo)
    values (rec.cni, rec.nom, rec.prenom, date '1980-01-01' + (i * 40), rec.zone, 'verifie', '{}')
    returning id_personne into v_pers;

    insert into demande(id_personne,id_campagne,canal,id_agent,etat,recommandation,consentement,consentement_moyen,date_soumission,created_at)
    values (v_pers, CAMP, 'assiste', ENROL,
      (case rec.etat when 'refuse' then 'refusee' when 'instruire' then 'a_instruire' when 'soumise' then 'soumise' else 'validee' end)::demande_etat,
      (case rec.etat when 'refuse' then 'non_eligible' when 'instruire' then 'a_instruire' else 'eligible' end)::demande_recommandation,
      true, 'signature',
      now() - make_interval(days => rec.days_ago),
      now() - make_interval(days => rec.days_ago))
    returning id_demande into v_dem;

    if rec.etat in ('valide','remis','remis_active') then
      insert into decision(id_demande,sens,motif,id_agent,horodatage)
      values (v_dem,'validee',null,INSTR, now() - make_interval(days => rec.days_ago) + interval '30 min');
    elsif rec.etat = 'refuse' then
      insert into decision(id_demande,sens,motif,id_agent,horodatage)
      values (v_dem,'refusee','Bénéficiaire déjà équipé d''un smartphone 4G — hors cible du programme.',INSTR, now() - make_interval(days => rec.days_ago) + interval '30 min');
    end if;

    if rec.etat in ('remis','remis_active') then
      select id_terminal into v_term from terminal where statut='en_stock' order by imei limit 1;
      insert into distribution(id_demande,id_terminal,id_agent,point_remise,date_remise,statut_activation)
      values (v_dem, v_term, REM, 'Centre de ' || rec.zone,
              now() - make_interval(days => rec.days_ago) + interval '2 hours',
              (case rec.etat when 'remis_active' then 'active' else 'non_active' end)::distribution_activation)
      returning id_distribution into v_dist;
      insert into preuve_remise(id_distribution,geolocalisation,id_agent,est_simule)
      values (v_dist, 'Simulée — ' || rec.zone, REM, true);
      update terminal set statut='remis', id_personne=v_pers where id_terminal=v_term;
    end if;
  end loop;

  -- Rattachement round-robin du stock disponible aux 6 points de retrait
  update terminal te set id_point_retrait = p.id_point
  from (select id_point, row_number() over (order by libelle) - 1 as idx from point_retrait) p,
       (select id_terminal, (row_number() over (order by imei)) % 6 as m from terminal where statut='en_stock') t
  where te.id_terminal = t.id_terminal and p.idx = t.m;
end$$;

-- Génère les 4 contrôles (dont opérateur / ligne mobile) pour les dossiers 2026 sans vérifications,
-- de façon cohérente avec la recommandation (opérateur non concluant pour les cas « à instruire »).
insert into verification (id_demande, source, resultat, est_simule, donnees_retour)
select d.id_demande,
       s.source::verification_source,
       (case when s.source = 'operateur' and d.recommandation = 'a_instruire' then 'non_concluant'
             else 'concluant' end)::verification_resultat,
       (s.source <> 'historique'),
       case s.source
         when 'oneci' then jsonb_build_object('libelle','Identité / pièce','detail','CNI valide, pas d''usurpation')
         when 'rsu' then jsonb_build_object('libelle','Éligibilité sociale','detail','Inscrit(e) au registre social')
         when 'operateur' then jsonb_build_object(
              'libelle','Ligne mobile',
              'nom_operateur', (array['Orange CI','MTN CI','Moov Africa'])[1 + (abs(hashtext(d.id_demande::text)) % 3)],
              'detail_ligne', case when d.recommandation = 'a_instruire'
                                   then 'Titulaire non concordant / ligne non retrouvée à ce nom'
                                   else 'Ligne active, titulaire concordant' end)
         else jsonb_build_object('libelle','Historique PASS (référentiel interne)','detail','Aucune attribution antérieure')
       end
from demande d
cross join (values ('oneci'),('rsu'),('operateur'),('historique')) as s(source)
where d.id_campagne = '44444444-4444-4444-4444-444444442026'
  and not exists (select 1 from verification v where v.id_demande = d.id_demande);

-- ===== Tickets SAV de démonstration =====
insert into sav_ticket(id_distribution, type_incident, statut, description, id_agent, created_at)
select d.id_distribution, 'panne'::sav_type, 'ouvert'::sav_statut,
       'Écran fissuré après une chute ; le tactile ne répond plus.', '11111111-1111-1111-1111-111111110003', now() - interval '1 day'
from distribution d join demande dm on dm.id_demande=d.id_demande join personne p on p.id_personne=dm.id_personne
where p.numero_cni='CI-900-005';

with tk as (
  insert into sav_ticket(id_distribution, type_incident, statut, description, id_agent, created_at)
  select d.id_distribution, 'vol'::sav_type, 'en_cours'::sav_statut,
         'Téléphone dérobé au marché ; plainte déposée à la gendarmerie.', '11111111-1111-1111-1111-111111110004', now() - interval '2 days'
  from distribution d join demande dm on dm.id_demande=d.id_demande join personne p on p.id_personne=dm.id_personne
  where p.numero_cni='CI-900-011'
  returning id_distribution
)
update terminal set statut='bloque'
where id_terminal in (select id_terminal from distribution where id_distribution in (select id_distribution from tk));

-- ===== Contacts de notification (le bénéficiaire n'a souvent pas de téléphone) =====
update personne
   set contact_relation = 'menage',
       telephone_contact = '+225 07 ' ||
         regexp_replace(lpad(substr(regexp_replace(numero_cni,'\D','','g'),1,8),8,'0'),
                        '(..)(..)(..)(..)', '\1 \2 \3 \4')
 where numero_cni like 'CI-900-%';
update personne set contact_relation = 'aucun', telephone_contact = null
 where numero_cni in ('CI-900-008','CI-900-024');

-- ===== Coordonnées des centres de retrait (adresse, téléphone, gestionnaire) =====
update point_retrait set adresse='Immeuble ANSUT, Bd Angoulvant, Plateau, Abidjan', telephone='+225 27 20 30 40 01', gestionnaire='M. KOUAMÉ Étienne' where id_point='88888888-8888-8888-8888-000000000001';
update point_retrait set adresse='Mairie de Yopougon, Abidjan',                     telephone='+225 27 20 30 40 02', gestionnaire='Mme ADJOUA Sylvie'   where id_point='88888888-8888-8888-8888-000000000002';
update point_retrait set adresse='Direction régionale ANSUT, Bouaké',              telephone='+225 27 31 30 40 03', gestionnaire='M. KONÉ Drissa'      where id_point='88888888-8888-8888-8888-000000000003';
update point_retrait set adresse='Préfecture de Korhogo, quartier Résidentiel',    telephone='+225 27 36 30 40 04', gestionnaire='M. SILUÉ Bakary'     where id_point='88888888-8888-8888-8888-000000000004';
update point_retrait set adresse='Mairie de Man, avenue de la Préfecture',         telephone='+225 27 33 30 40 05', gestionnaire='Mme GUÉU Rose'       where id_point='88888888-8888-8888-8888-000000000005';
update point_retrait set adresse='Direction départementale ANSUT, Odienné',        telephone='+225 27 33 30 40 06', gestionnaire='M. DIABATÉ Sékou'    where id_point='88888888-8888-8888-8888-000000000006';

-- ===== Indicateurs SLA + clôtures de démonstration =====
update demande set duree_enrolement_sec = 25 + (abs(hashtext(id_demande::text)) % 70)
 where id_campagne = '44444444-4444-4444-4444-444444442026' and duree_enrolement_sec is null;

insert into cloture(id_demande, conforme, observations, id_agent, horodatage)
select d.id_demande, true, 'Procédure conforme — pièces, consentement, décision et preuve vérifiés.',
       '11111111-1111-1111-1111-111111110004', d.created_at + interval '3 hours'
from demande d
where d.id_campagne='44444444-4444-4444-4444-444444442026'
  and ((d.etat='validee' and exists(select 1 from distribution di where di.id_demande=d.id_demande)) or d.etat='refusee')
  and not exists(select 1 from cloture c where c.id_demande=d.id_demande)
limit 6;
