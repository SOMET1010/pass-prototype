import { useEffect, useState } from "react";
import { ShieldCheck, Fingerprint, Loader2, Stamp } from "lucide-react";
import { lireCachet, scellerPiece } from "../lib/ansut";
import { SimuleBadge } from "./Badges";
import { formatDateHeure } from "../lib/rules";
import type { CachetElectronique, CibleCachet } from "../lib/types";

/** Badge « Scellé (réel) » — cachet qualifié par la cryptologie ANSUT. */
function ScelleBadge() {
  return (
    <span
      title="Cachet électronique qualifié — Cryptologie ANSUT"
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 border border-emerald-300"
    >
      <ShieldCheck size={12} /> Scellé
    </span>
  );
}

/**
 * Cachet électronique d'une pièce probante (décision / preuve de remise).
 * Affiche l'empreinte SHA-256 et la signature, avec le badge du mode.
 * Le bouton « Sceller » déclenche l'Edge Function de cryptologie ANSUT.
 */
export function CachetPanel({
  cibleType,
  cibleId,
  titre = "Cachet électronique",
}: {
  cibleType: CibleCachet;
  cibleId: string | undefined;
  titre?: string;
}) {
  const [cachet, setCachet] = useState<CachetElectronique | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!cibleId) return setLoading(false);
      setCachet(await lireCachet(cibleType, cibleId));
      setLoading(false);
    })();
  }, [cibleType, cibleId]);

  async function sceller() {
    if (!cibleId) return;
    setBusy(true);
    setErreur(null);
    try {
      const r = await scellerPiece(cibleType, cibleId);
      setCachet(r.cachet);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Scellement impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (!cibleId) return null;

  return (
    <div className="rounded-lg border border-pass-blue/25 bg-pass-blue-light/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-pass-blue-dark">
          <Stamp size={16} /> {titre}
        </div>
        {cachet ? (cachet.mode === "reel" ? <ScelleBadge /> : <SimuleBadge />) : null}
      </div>

      {loading ? (
        <div className="mt-2 text-sm text-slate-400">Chargement…</div>
      ) : cachet ? (
        <div className="mt-3 space-y-2">
          <div>
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
              <Fingerprint size={12} /> Empreinte {cachet.algorithme}
            </div>
            <div className="font-mono text-[11px] break-all text-slate-700 leading-snug">{cachet.empreinte}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Signature</div>
            <div className="font-mono text-[11px] break-all text-slate-600 leading-snug">{cachet.signature}</div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 pt-1">
            <span>Autorité : <strong className="text-slate-700">{cachet.autorite}</strong></span>
            {cachet.reference && <span>Réf. : <span className="font-mono">{cachet.reference}</span></span>}
            <span>Scellé le {formatDateHeure(cachet.horodatage_scelle)}</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            L'empreinte lie ce document à son contenu exact : toute altération la rend invalide.
            {cachet.mode === "simule" &&
              " La signature qualifiée sera apposée par la Cryptologie ANSUT une fois la passerelle raccordée."}
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-slate-600">Cette pièce n'est pas encore scellée.</p>
          <button onClick={sceller} disabled={busy} className="btn-primary text-sm">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Stamp size={15} />}
            {busy ? "Scellement…" : "Sceller la pièce"}
          </button>
        </div>
      )}
      {erreur && <div className="mt-2 text-xs text-red-600">{erreur}</div>}
    </div>
  );
}
