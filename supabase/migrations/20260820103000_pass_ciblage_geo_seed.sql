-- Jeu de démonstration : 14 localités (dont 3 exclues par les filtres),
-- rattachées aux points de retrait existants par zone.
insert into localite(identifiant_localite,nom,region,departement,sous_prefecture,latitude,longitude,population,taux_pauvrete,taux_possession,part_femmes_jeunes,rural,distance_site_km,couverture_2g,couverture_3g,couverture_4g,electrifiee,point_recharge,point_remise_id) values
 ('LOC-001','Katiola-Nord','Vallée du Bandama','Katiola','Katiola',8.13,-5.10,12000,0.62,0.28,0.55,true,42.0,true,true,false,true,true,(select id_point from point_retrait where zone='Bouaké' limit 1)),
 ('LOC-002','Niakaramandougou','Vallée du Bandama','Niakara','Niakara',8.66,-5.28,7800,0.71,0.19,0.58,true,88.0,true,false,true,true,false,(select id_point from point_retrait where zone='Bouaké' limit 1)),
 ('LOC-003','Tortiya','Vallée du Bandama','Niakara','Tortiya',8.78,-5.68,4200,0.74,0.14,0.60,true,120.0,true,false,false,false,false,null),
 ('LOC-004','Dianra','Béré','Mankono','Dianra',8.72,-6.30,6100,0.69,0.17,0.57,true,140.0,true,true,false,false,true,(select id_point from point_retrait where zone='Korhogo' limit 1)),
 ('LOC-005','Sirasso','Poro','Korhogo','Sirasso',9.22,-5.68,9300,0.66,0.22,0.54,true,55.0,true,true,true,true,true,(select id_point from point_retrait where zone='Korhogo' limit 1)),
 ('LOC-006','Napiéolédougou','Poro','Korhogo','Napié',9.30,-5.40,5400,0.70,0.16,0.59,true,73.0,true,true,false,true,false,(select id_point from point_retrait where zone='Korhogo' limit 1)),
 ('LOC-007','Odienné-Sud','Kabadougou','Odienné','Odienné',9.48,-7.56,15000,0.58,0.31,0.52,false,15.0,true,true,true,true,true,(select id_point from point_retrait where zone='Odienné' limit 1)),
 ('LOC-008','Samatiguila','Kabadougou','Odienné','Samatiguila',9.80,-7.55,3800,0.76,0.12,0.61,true,160.0,true,false,false,true,false,null),
 ('LOC-009','Facobly','Guémon','Duékoué','Facobly',7.15,-7.35,8700,0.64,0.24,0.56,true,60.0,true,true,false,true,true,(select id_point from point_retrait where zone='Man' limit 1)),
 ('LOC-010','Kouibly','Guémon','Kouibly','Kouibly',7.26,-7.25,6900,0.67,0.20,0.57,true,48.0,true,true,true,false,true,(select id_point from point_retrait where zone='Man' limit 1)),
 ('LOC-011','Sangouiné','Tonkpi','Man','Sangouiné',7.30,-7.70,5200,0.72,0.15,0.60,true,95.0,true,false,false,false,false,null),
 ('LOC-012','Yopougon-Extension','Abidjan','Abidjan','Yopougon',5.34,-4.09,45000,0.28,0.66,0.48,false,3.0,true,true,true,true,true,(select id_point from point_retrait where zone='Abidjan' limit 1)),
 ('LOC-013','Anyama-Village','Abidjan','Abidjan','Anyama',5.49,-4.05,22000,0.34,0.58,0.50,false,12.0,true,true,true,true,true,(select id_point from point_retrait where zone='Abidjan' limit 1)),
 ('LOC-014','Blésségué','Bagoué','Boundiali','Blésségué',9.62,-6.10,4600,0.75,0.13,0.62,true,110.0,true,true,false,true,true,(select id_point from point_retrait where zone='Korhogo' limit 1))
on conflict (identifiant_localite) do nothing;
