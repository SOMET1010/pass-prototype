import { useState } from "react";
import { Send, Radio, Building2, Truck } from "lucide-react";
import { useStore } from "../store/store";
import { useAuth } from "../auth/AuthContext";
import type { Partenaire, StatutRelation, NaturePartenaire } from "../types";
import { EnTete, BadgeRelation } from "../components/ui";
import { formatDate, libelleEcheance } from "../lib/dates";
import { brouillonPartenaire } from "../lib/notifications";
import { partenairesARelancer } from "../lib/roadmap";
import { Notifier } from "../components/gateway-ui";

const STATUTS: { id: StatutRelation; label: string }[] = [
  { id: "a_engager", label: "À engager" },
  { id: "en_cours", label: "En cours" },
  { id: "engage", label: "Engagé" },
  { id: "convention_signee", label: "Convention signée" },
];

const GROUPES: { nature: NaturePartenaire; titre: string; icon: any }[] = [
  { nature: "institution", titre: "Institutions", icon: Building2 },
  { nature: "operateur", titre: "Opérateurs", icon: Radio },
  { nature: "fournisseur", titre: "Fournisseurs", icon: Truck },
];

export default function Partenaires() {
  const { data, dateRef, updatePartenaire } = useStore();
  const { peutEcrire } = useAuth();
  const [notif, setNotif] = useState<Partenaire | null>(null);

  const aRelancer = new Set(partenairesARelancer(data, dateRef).map((p) => p.id));

  return (
    <div>
      <EnTete titre="Partenaires"
        sous="Institutions, opérateurs et fournisseurs. Le suivi se fait sur eux, non avec eux : ils n'accèdent pas au workspace. L'outil prépare les sollicitations et relances." />

      {aRelancer.size > 0 && (
        <div className="card border border-amber-200 bg-amber-50 p-4 mb-5 text-sm text-amber-800">
          <strong>{aRelancer.size} partenaire(s) à engager sous 10 jours.</strong> Préparez les sollicitations avant les rencontres prévues.
        </div>
      )}

      <div className="space-y-6">
        {GROUPES.map(({ nature, titre, icon: Icon }) => {
          const items = data.partenaires.filter((p) => p.nature === nature);
          if (!items.length) return null;
          return (
            <section key={nature}>
              <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-2"><Icon size={17} className="text-pass-blue" /> {titre}</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((p) => (
                  <div key={p.id} className={`card p-4 ${aRelancer.has(p.id) ? "ring-1 ring-amber-300" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-800">{p.libelle}</span>
                      <BadgeRelation s={p.statutRelation} />
                    </div>
                    {p.convention && <div className="text-xs text-slate-500 mt-1">Convention : {p.convention}</div>}
                    {p.prochaineEcheance && <div className="text-xs text-slate-500 mt-0.5">Échéance : {formatDate(p.prochaineEcheance)} · <span className="text-pass-orange">{libelleEcheance(p.prochaineEcheance, dateRef)}</span></div>}
                    {p.note && <div className="text-xs text-slate-400 mt-1">{p.note}</div>}
                    <div className="flex items-center gap-2 mt-3">
                      {peutEcrire && (
                        <select className="field-input py-1 text-xs w-auto flex-1" value={p.statutRelation}
                          onChange={(e) => updatePartenaire(p.id, { statutRelation: e.target.value as StatutRelation })}>
                          {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      )}
                      <button className="btn-ghost btn-sm" onClick={() => setNotif(p)}><Send size={13} /> Notifier</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {notif && (() => {
        const b = brouillonPartenaire(notif, data);
        return <Notifier titre={`Notifier — ${notif.libelle}`} defautTo={b.email ?? ""} defautSubject={b.objet} defautContent={b.corps} onClose={() => setNotif(null)} />;
      })()}
    </div>
  );
}
