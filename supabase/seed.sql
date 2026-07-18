-- ===================== JEU DE DONNÉES DE DÉMONSTRATION =====================
-- À exécuter en une seule transaction (contrainte différée RM-181 vérifiée au commit).
-- Données 100% fictives.

-- ---- Comptes Auth (4 agents) ----
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values
 ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222220001','authenticated','authenticated','enrolement@pass.demo', crypt('passdemo2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
 ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222220002','authenticated','authenticated','instructeur@pass.demo', crypt('passdemo2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
 ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222220003','authenticated','authenticated','remise@pass.demo', crypt('passdemo2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
 ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222220004','authenticated','authenticated','superviseur@pass.demo', crypt('passdemo2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','','');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
 (gen_random_uuid(),'22222222-2222-2222-2222-222222220001','22222222-2222-2222-2222-222222220001', jsonb_build_object('sub','22222222-2222-2222-2222-222222220001','email','enrolement@pass.demo'),'email', now(), now(), now()),
 (gen_random_uuid(),'22222222-2222-2222-2222-222222220002','22222222-2222-2222-2222-222222220002', jsonb_build_object('sub','22222222-2222-2222-2222-222222220002','email','instructeur@pass.demo'),'email', now(), now(), now()),
 (gen_random_uuid(),'22222222-2222-2222-2222-222222220003','22222222-2222-2222-2222-222222220003', jsonb_build_object('sub','22222222-2222-2222-2222-222222220003','email','remise@pass.demo'),'email', now(), now(), now()),
 (gen_random_uuid(),'22222222-2222-2222-2222-222222220004','22222222-2222-2222-2222-222222220004', jsonb_build_object('sub','22222222-2222-2222-2222-222222220004','email','superviseur@pass.demo'),'email', now(), now(), now());

-- ---- Agents ----
insert into agent (id_agent, user_id, identite, role, statut) values
 ('11111111-1111-1111-1111-111111110001','22222222-2222-2222-2222-222222220001','KONÉ Awa (Enrôlement)','enrolement','actif'),
 ('11111111-1111-1111-1111-111111110002','22222222-2222-2222-2222-222222220002','DIABATÉ Ismaël (Instructeur)','instructeur','actif'),
 ('11111111-1111-1111-1111-111111110003','22222222-2222-2222-2222-222222220003','TANOH Serge (Remise)','remise','actif'),
 ('11111111-1111-1111-1111-111111110004','22222222-2222-2222-2222-222222220004','N''GORAN Aya (Superviseur)','superviseur','actif');

-- ---- Campagnes ----
insert into campagne (id_campagne, libelle, date_debut, date_fin, zones_couvertes, quota_total, etat) values
 ('44444444-4444-4444-4444-444444442024','PASS 2024 — Phase pilote','2024-03-01','2024-12-31', array['Abidjan','Bouaké'], 500, 'cloturee'),
 ('44444444-4444-4444-4444-444444442026','PASS 2026 — Campagne nationale','2026-06-01','2026-12-31', array['Korhogo','Man','Odienné','Bouaké','Abidjan'], 100, 'ouverte');

-- ---- Personnes (5 personas + 3 dossiers de remplissage) ----
insert into personne (id_personne, numero_cni, nom, prenoms, date_naissance, zone_residence, statut_verif_identite, profil_demo) values
 ('33333333-3333-3333-3333-333333330001','CI-001-334455','KOUASSI','Mariam','1972-04-12','Korhogo','non_verifie',
    '{"identite":"concluant","sociale":"concluant","ligne":"concluant","nom_operateur":"MTN CI","detail_ligne":"Ligne active depuis 8 ans","detail_sociale":"Inscrite RSU — filet social productif","detail_identite":"CNI valide, pas d''usurpation"}'),
 ('33333333-3333-3333-3333-333333330002','CI-002-778899','TRAORÉ','Adama','1994-09-03','Bouaké','verifie',
    '{"identite":"concluant","sociale":"concluant","ligne":"concluant","nom_operateur":"Orange CI","detail_ligne":"Possède déjà un smartphone 4G"}'),
 ('33333333-3333-3333-3333-333333330003','CI-003-112233','DIALLO','Awa','1988-01-20','Man','non_verifie',
    '{"identite":"concluant","sociale":"concluant","ligne":"indisponible","detail_ligne":"Aucune ligne enregistrée à ce nom"}'),
 ('33333333-3333-3333-3333-333333330004','CI-004-556677','KOFFI YAO','N''GUESSAN','1965-11-30','Odienné','non_verifie',
    '{"identite":"concluant","sociale":"concluant","ligne":"non_concluant","nom_operateur":"KOFFI YAO","detail_ligne":"Nom opérateur (KOFFI YAO) different du nom CNI (KOFFI YAO N''GUESSAN)"}'),
 ('33333333-3333-3333-3333-333333330005','CI-005-990011','COULIBALY','Fatou','1970-06-15','Korhogo','non_verifie',
    '{"identite":"concluant","sociale":"concluant","ligne":"concluant","nom_operateur":"Moov Africa","detail_ligne":"Ligne active depuis 3 ans","detail_sociale":"Bénéficiaire CMU"}'),
 ('33333333-3333-3333-3333-333333330011','CI-011-101010','BAMBA','Salif','1980-02-02','Bouaké','verifie','{}'),
 ('33333333-3333-3333-3333-333333330012','CI-012-202020','OUATTARA','Aminata','1990-07-07','Abidjan','verifie','{}'),
 ('33333333-3333-3333-3333-333333330013','CI-013-303030','KONÉ','Ibrahim','1985-05-05','Man','non_verifie','{}');

-- ---- Terminaux (10 en stock + 1 pour le bénéfice antérieur d'Adama) ----
insert into terminal (id_terminal, modele, imei, statut) values
 ('55555555-5555-5555-5555-555555550001','Tecno Spark 20C','356938035001001','en_stock'),
 ('55555555-5555-5555-5555-555555550002','Tecno Spark 20C','356938035001002','en_stock'),
 ('55555555-5555-5555-5555-555555550003','Tecno Spark 20C','356938035001003','en_stock'),
 ('55555555-5555-5555-5555-555555550004','itel P55','356938035001004','en_stock'),
 ('55555555-5555-5555-5555-555555550005','itel P55','356938035001005','en_stock'),
 ('55555555-5555-5555-5555-555555550006','itel P55','356938035001006','en_stock'),
 ('55555555-5555-5555-5555-555555550007','Samsung Galaxy A05','356938035001007','en_stock'),
 ('55555555-5555-5555-5555-555555550008','Samsung Galaxy A05','356938035001008','en_stock'),
 ('55555555-5555-5555-5555-555555550009','Samsung Galaxy A05','356938035001009','en_stock'),
 ('55555555-5555-5555-5555-555555550010','Nokia C32','356938035001010','en_stock'),
 ('55555555-5555-5555-5555-555555559999','Samsung Galaxy A04','356938035009999','en_stock');

-- ---- Bénéfice antérieur d'Adama (campagne 2024) → historique PASS réel ----
insert into demande (id_demande, id_personne, id_campagne, canal, id_agent, etat, recommandation, consentement, consentement_moyen, date_soumission)
values ('66666666-6666-6666-6666-666666662024','33333333-3333-3333-3333-333333330002','44444444-4444-4444-4444-444444442024','assiste','11111111-1111-1111-1111-111111110001','validee','eligible', true,'signature','2024-05-10 10:00:00+00');
insert into decision (id_demande, sens, motif, id_agent) values
 ('66666666-6666-6666-6666-666666662024','validee', null, '11111111-1111-1111-1111-111111110002');
insert into distribution (id_distribution, id_demande, id_terminal, id_agent, point_remise, date_remise)
values ('77777777-7777-7777-7777-777777772024','66666666-6666-6666-6666-666666662024','55555555-5555-5555-5555-555555559999','11111111-1111-1111-1111-111111110003','Centre de Bouaké','2024-05-12 09:30:00+00');
insert into preuve_remise (id_distribution, photo_url, geolocalisation, id_agent, est_simule)
values ('77777777-7777-7777-7777-777777772024', null, 'Simulée — Bouaké', '11111111-1111-1111-1111-111111110003', true);
update terminal set statut='remis', id_personne='33333333-3333-3333-3333-333333330002' where id_terminal='55555555-5555-5555-5555-555555559999';

-- ---- Dossiers de remplissage (campagne 2026) pour peupler la supervision ----
insert into demande (id_demande, id_personne, id_campagne, canal, id_agent, etat, recommandation, consentement, consentement_moyen, date_soumission) values
 ('66666666-6666-6666-6666-666666660011','33333333-3333-3333-3333-333333330011','44444444-4444-4444-4444-444444442026','assiste','11111111-1111-1111-1111-111111110001','validee','eligible', true,'signature', now()),
 ('66666666-6666-6666-6666-666666660012','33333333-3333-3333-3333-333333330012','44444444-4444-4444-4444-444444442026','assiste','11111111-1111-1111-1111-111111110001','refusee','non_eligible', true,'signature', now()),
 ('66666666-6666-6666-6666-666666660013','33333333-3333-3333-3333-333333330013','44444444-4444-4444-4444-444444442026','assiste','11111111-1111-1111-1111-111111110001','a_instruire','a_instruire', true,'assiste_temoin', now());
insert into decision (id_demande, sens, motif, id_agent) values
 ('66666666-6666-6666-6666-666666660011','validee', null, '11111111-1111-1111-1111-111111110002'),
 ('66666666-6666-6666-6666-666666660012','refusee','Bénéficiaire déjà équipé d''un smartphone 4G — hors cible du programme.', '11111111-1111-1111-1111-111111110002');

insert into journal_audit (acteur, action, cible_type, cible_id) values
 ('Système','initialisation du jeu de démonstration','campagne','PASS 2026 — Campagne nationale');
