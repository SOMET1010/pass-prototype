import { useEffect, useState } from "react";
import { ShieldCheck, Fingerprint, Undo2, Loader2, AlertOctagon } from "lucide-react";
import { annulerDecision, chargerDefendabilite, type Defendabilite as TDef } from "../lib/defendabilite";
import { toast } from "./Toaster";
import { useAuth } from "../context/AuthContext";
import { formatDateHeure } from "../lib/rules";

/**
 * Défendabilité de la décision (Architecture ANSUT §3) :
 * - snapshot auto-suffisant (rejeu sans système vivant) + empreinte SHA-256 ;
 * - « irréversible ≠ incorrigible » : annulation append-only (compensation tracée).
 */
export function Defendabilite({ idDemande }: { idDemande: string }) {
  const { agent } = useAuth();
  const superviseur = agent?.role === "superviseur";
  const [d, setD] = useState<TDef | null>(null);
  const [motif, setMotif] = useState("");
  const [autorisation, setAutorisation] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function charger() { setD(await chargerDefendabilite(idDemande)); }
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [idDemande]);

  if (!d || !d.decision) return null;
  const annulee = !!d.annulation;

  async function annuler() {
    if (!d?.decision) return;
    if (!motif.trim() || !autorisation.trim()) return toast("Motif et autorisation obligatoires.", "error");
    setBusy(true);
    try {
      await annulerDecision(d.decision.id_decision, motif, autorisation);
      toast("Décision annulée (compensation tracée).", "success");
      setOpen(false); setMotif(""); setAutorisation(""); await charger();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="card p-5 space-y-3">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <ShieldCheck size={18} className="text-pass-blue" /> Défendabilité de la décision
      </h2>
      <p className="text-xs text-slate-500 -mt-1 max-w-2xl">
        Un snapshot auto-suffisant fige les entrées, la version des règles et les réponses externes : la décision est
        <strong> rejouable des mois plus tard</strong>, sans dépendre d'un système vivant (Architecture §3.1).
      </p>

      {d.snapshot ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
            <Fingerprint size={12} /> Empreinte du snapshot (SHA-256)
          </div>
          <div className="font-mono text-[11px] break-all text-slate-700">{d.snapshot.empreinte}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Figé le {formatDateHeure(d.snapshot.horodatage)} · {Object.keys(d.snapshot.donnees ?? {}).length} sections archivées
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400">Aucun snapshot (décision antérieure au dispositif).</div>
      )}

      {annulee ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertOctagon size={15} /> Décision annulée (compensation append-only)
          </div>
          <div className="mt-1 text-xs text-slate-600 space-y-0.5">
            <div><strong>Motif :</strong> {d.annulation!.motif}</div>
            <div><strong>Autorisation :</strong> {d.annulation!.autorisation}</div>
            <div className="text-slate-400">Le {formatDateHeure(d.annulation!.horodatage)} · empreinte <span className="font-mono">{d.annulation!.empreinte.slice(0, 16)}…</span></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            La décision d'origine reste intacte (jamais mutée) ; l'annulation est une écriture liée, elle-même auditée. Le quota a été libéré.
          </p>
        </div>
      ) : superviseur ? (
        <div>
          {!open ? (
            <button onClick={() => setOpen(true)} className="btn-ghost text-sm text-red-600 border-red-200">
              <Undo2 size={15} /> Annuler la décision (compensation)
            </button>
          ) : (
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="text-xs text-slate-500">
                L'annulation est une décision auditée : elle exige un motif et une autorisation (Architecture §3.2).
              </div>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Motif (erreur, fraude…)"
                value={motif} onChange={(e) => setMotif(e.target.value)} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Autorisation (note, décision hiérarchique…)"
                value={autorisation} onChange={(e) => setAutorisation(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={annuler} disabled={busy} className="btn-primary text-sm !bg-red-600">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />} Confirmer l'annulation
                </button>
                <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Annuler</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">La correction par compensation est réservée au superviseur.</p>
      )}
    </div>
  );
}
