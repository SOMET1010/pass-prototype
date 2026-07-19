import { ShieldAlert, Database, FlaskConical, Globe, Lock, FileCheck, Radio, Stamp } from "lucide-react";

export function APropos() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-orange-light text-pass-orange">
          <ShieldAlert size={20} />
        </div>
        <h1 className="text-xl font-bold">À propos de ce prototype</h1>
      </div>

      <div className="card border-pass-orange/40 bg-pass-orange-light/40 p-5">
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Prototype de démonstration.</strong> Les vérifications ONECI, RSU et opérateurs sont{" "}
          <strong>simulées</strong>. Aucune donnée réelle n'est traitée. L'hébergement n'est pas souverain — cette
          application <strong>n'est pas destinée à la production</strong>.
        </p>
      </div>

      <section className="card p-5 space-y-4">
        <h2 className="text-base font-semibold">Ce que ce prototype démontre</h2>
        <ul className="space-y-3 text-sm text-slate-600">
          <Item icon={<FileCheck className="text-pass-blue" size={18} />}>
            Le parcours complet : enrôlement assisté → vérification d'éligibilité → décision → remise du terminal → reçu
            bénéficiaire, ainsi que la supervision.
          </Item>
          <Item icon={<Database className="text-pass-blue" size={18} />}>
            Les règles métier critiques sont <strong>effectives en base de données</strong> (contraintes UNIQUE, non-cumul,
            quota, décision irréversible, dossier probant obligatoire) : elles ne sont pas contournables par un appel
            direct à l'API.
          </Item>
          <Item icon={<Lock className="text-pass-blue" size={18} />}>
            Le journal d'audit est <strong>inaltérable</strong> et une décision, une fois prise, ne peut plus être
            modifiée.
          </Item>
        </ul>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-base font-semibold">Ce que ce prototype ne fait PAS</h2>
        <ul className="space-y-3 text-sm text-slate-600">
          <Item icon={<FlaskConical className="text-pass-orange" size={18} />}>
            Aucune connexion réelle aux référentiels nationaux (ONECI, RSU, opérateurs mobiles, registre IMEI). Ces
            vérifications portent le badge <strong>« SIMULÉ »</strong>.
          </Item>
          <Item icon={<Globe className="text-pass-orange" size={18} />}>
            Aucune chaîne de preuve matérielle (scan IMEI par lecteur, GPS certifié, photo horodatée opposable) ni
            hébergement souverain.
          </Item>
          <Item icon={<ShieldAlert className="text-pass-orange" size={18} />}>
            Aucune biométrie ni reconnaissance faciale (cadre juridique non validé).
          </Item>
        </ul>
        <p className="text-xs text-slate-400">
          Ces éléments relèvent d'arbitrages institutionnels (conventions d'accès, architecture souveraine) et non du
          développement du prototype.
        </p>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-base font-semibold">Intégrations institutionnelles ANSUT</h2>
        <p className="text-sm text-slate-600">
          Le prototype est raccordé aux passerelles ANSUT déjà en service sur d'autres projets de l'Agence. La chaîne
          d'appel est réelle&nbsp;; elle bascule automatiquement en <strong>mode réel</strong> dès que les identifiants
          sont fournis à l'environnement, et reste en <strong>mode simulé</strong> sinon — sans jamais bloquer le parcours.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-pass-blue/25 bg-pass-blue-light/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-pass-blue-dark">
              <Radio size={16} /> ANSUT Hub — messagerie
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Notifie réellement le bénéficiaire (ou son contact) du lieu de retrait et de la décision, par SMS / e-mail /
              WhatsApp. Chaque envoi est journalisé avec son statut (envoyé / échec) et son mode.
            </p>
            <p className="mt-1.5 text-[11px] text-slate-400 font-mono">
              Edge Function « ansut-hub » · secrets ANSUT_HUB_URL / USERNAME / PASSWORD
            </p>
          </div>
          <div className="rounded-lg border border-pass-blue/25 bg-pass-blue-light/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-pass-blue-dark">
              <Stamp size={16} /> Cryptologie ANSUT — cachet
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Scelle les pièces probantes (décision, preuve de remise) : empreinte SHA-256 du document + signature
              horodatée, de sorte que toute altération soit détectable et le dossier opposable.
            </p>
            <p className="mt-1.5 text-[11px] text-slate-400 font-mono">
              Edge Function « ansut-cachet » · secrets ANSUT_CRYPTO_URL / USERNAME / PASSWORD
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          L'empreinte est toujours calculée en base (même hors ligne)&nbsp;; seule la signature qualifiée requiert le
          raccordement au service de cryptologie. Les écritures passent par des fonctions nommées, auditées et non
          contournables.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-2">Programme PASS</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Le Programme d'Accès aux Smartphones Subventionnés est porté par l'ANSUT (Agence Nationale du Service Universel des
          Télécommunications/TIC). Il subventionne l'acquisition de smartphones pour des bénéficiaires identifiés,
          prioritairement les ayants droit des programmes sociaux publics, afin de réduire la fracture numérique
          individuelle.
        </p>
      </section>

      <p className="text-center text-xs text-slate-400">
        Prototype PASS · version de démonstration · {new Date().getFullYear()}
      </p>
    </div>
  );
}

function Item({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
