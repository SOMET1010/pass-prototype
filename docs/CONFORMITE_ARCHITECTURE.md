# Conformité à l'architecture cible ANSUT

Référence : [`Architecture_PASS_ANSUT.pdf`](./Architecture_PASS_ANSUT.pdf) — architecture cible sur Microsoft Azure, DTDI/ANSUT.

Le prototype ne migre pas l'infrastructure (Azure App Service/AKS, NestJS, Blob/Key Vault, Service Bus, PWA offline, Entra ID) — cela relève de la production. Mais il implémente **la couche qui fait la valeur défendable du système**, en SQL standard **portable vers Azure Database for PostgreSQL**, exactement comme le prescrit l'architecture (« les garanties d'intégrité vivent en base »).

## Ce qui est implémenté (en base, portable Azure)

| Exigence architecture | Statut | Mise en œuvre |
| --- | --- | --- |
| **§3.1 Snapshot de décision auto-suffisant** | ✅ | Table `decision_snapshot` (immuable) + trigger : fige entrées, **version des règles**, **réponses externes**, résultat, horodatage. Empreinte **SHA-256**. Décision rejouable sans système vivant. |
| **§3.2 Irréversible ≠ incorrigible** | ✅ | Table `annulation` **append-only** + `pass_annuler_decision` : compensation liée, jamais de mutation de l'original ; l'annulation est elle-même auditée (qui, motif, autorisation). Le quota se libère. |
| **§6.3 Quota dur atomique** | ✅ | `check_quota` avec **verrou `FOR UPDATE`** sur la campagne (course au dernier créneau) ; le trigger **lit** le quota, ne le recopie jamais ; exclut les décisions annulées. |
| **§8 Séparation des tâches** | ✅ | Trigger : l'agent qui a **enrôlé** ne peut pas **remettre**. |
| **§8 Seuils de vélocité** | ✅ | Vue `v_velocite_remise` + paramètre `seuil_velocite_remises_jour`. |
| **Intégrité en base, SQL portable** | ✅ (déjà) | RLS, `SECURITY DEFINER`, triggers, journal inaltérable, unicité CNI/IMEI, plafonds — SQL standard, aucun enfermement propriétaire. |
| **Paramètres administrables versionnés** | ✅ (déjà) | `parametre` / `parametre_version` (horodaté, attribué). |
| **Mention SIMULÉ** | ✅ (déjà) | Bandeau + badges sur toutes les données de vérification. |

## Ce qui relève de la production (hors prototype)

Azure (App Service/AKS, région & résidence des données), autorisations **ARTCI** (traitement + transfert hors CI, loi n°2013-450), **DPIA**, interconnexion **ONECI** réelle + circuit breaker, **Blob Storage + Key Vault**, **Service Bus** (pattern Outbox), **PWA offline-first** avec file de synchronisation, choix **Entra ID / Keycloak**, CI/CD Azure DevOps, RPO/RTO/PRA. Ces points sont organisationnels, juridiques ou infrastructurels ; le socle de données du prototype est conçu pour s'y porter sans réécriture.
