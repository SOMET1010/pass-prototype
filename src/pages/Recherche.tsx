import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, QrCode, Camera, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "../components/Toaster";
import { EtatBadge } from "../components/Badges";
import type { Demande } from "../lib/types";

interface Row extends Demande {
  personne: { nom: string; prenoms: string; numero_cni: string } | null;
}

// BarcodeDetector est natif sur Chromium ; on l'utilise sans dépendance externe.
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

export function Recherche() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [scanActif, setScanActif] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();

  const scanDisponible = typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== "undefined";

  useEffect(() => {
    supabase
      .from("demande")
      .select("*, personne(nom,prenoms,numero_cni)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  const s = q.trim().toLowerCase();
  const resultats =
    s.length < 2
      ? []
      : rows.filter(
          (r) =>
            r.numero_dossier.toLowerCase().includes(s) ||
            r.personne?.nom.toLowerCase().includes(s) ||
            r.personne?.prenoms.toLowerCase().includes(s) ||
            r.personne?.numero_cni.toLowerCase().includes(s),
        );

  async function ouvrirParNumero(numeroDossier: string) {
    const valeur = numeroDossier.trim().toUpperCase();
    const local = rows.find((r) => r.numero_dossier.toUpperCase() === valeur);
    if (local) {
      stopScan();
      return navigate(`/verification/${local.id_demande}`);
    }
    const { data } = await supabase.from("demande").select("id_demande").eq("numero_dossier", valeur).maybeSingle();
    if (!data) return toast(`Aucun dossier « ${valeur} ».`, "error");
    stopScan();
    navigate(`/verification/${(data as { id_demande: string }).id_demande}`);
  }

  async function startScan() {
    if (!scanDisponible) return toast("Le scan n'est pas disponible sur ce navigateur.", "info");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanActif(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector: BarcodeDetectorLike = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const boucle = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            ouvrirParNumero(codes[0].rawValue);
            return;
          }
        } catch {
          /* ignore */
        }
        rafRef.current = requestAnimationFrame(boucle);
      };
      rafRef.current = requestAnimationFrame(boucle);
    } catch {
      toast("Accès à la caméra refusé ou indisponible.", "error");
      setScanActif(false);
    }
  }

  function stopScan() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanActif(false);
  }

  useEffect(() => () => stopScan(), []);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue-light text-pass-blue">
          <Search size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Retrouver un dossier</h1>
          <p className="text-sm text-slate-500">Par nom, numéro de pièce (CNI), numéro de dossier, ou scan du QR du reçu.</p>
        </div>
      </div>

      {/* Recherche unifiée */}
      <div className="card p-5 space-y-3">
        <label className="field-label">Nom, prénoms, CNI ou numéro de dossier</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field-input pl-9"
            placeholder="Ex. Mariam, CI-001-334455, PASS-2026-00001…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>

        {s.length >= 2 && (
          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
            {resultats.length === 0 ? (
              <p className="py-3 text-sm text-slate-400">Aucun résultat.</p>
            ) : (
              resultats.slice(0, 12).map((r) => (
                <Link
                  key={r.id_demande}
                  to={`/verification/${r.id_demande}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700 truncate">
                      {r.personne ? `${r.personne.nom} ${r.personne.prenoms}` : "—"}
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="font-mono">{r.numero_dossier}</span> ·{" "}
                      <span className="font-mono">{r.personne?.numero_cni}</span>
                    </div>
                  </div>
                  <EtatBadge etat={r.etat} />
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Scan QR */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <QrCode size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Scanner le reçu</h2>
        </div>
        {!scanDisponible ? (
          <p className="text-sm text-slate-400">
            Le scan par caméra n'est pas pris en charge par ce navigateur. Utilisez la recherche ci-dessus.
          </p>
        ) : !scanActif ? (
          <button onClick={startScan} className="btn-ghost">
            <Camera size={16} /> Activer la caméra
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-black">
              <video ref={videoRef} className="w-full max-h-72 object-contain" muted playsInline />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-40 w-40 rounded-lg border-2 border-white/80" />
              </div>
            </div>
            <button onClick={stopScan} className="btn-ghost">
              <XCircle size={16} /> Arrêter
            </button>
            <p className="text-xs text-slate-400">Présentez le QR code du reçu devant la caméra.</p>
          </div>
        )}
      </div>
    </div>
  );
}
