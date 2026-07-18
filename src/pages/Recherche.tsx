import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, QrCode, Camera, XCircle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "../components/Toaster";

// BarcodeDetector est natif sur Chromium ; on l'utilise sans dépendance externe.
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

export function Recherche() {
  const navigate = useNavigate();
  const [num, setNum] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanActif, setScanActif] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();

  const scanDisponible = typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== "undefined";

  async function ouvrirDossier(numeroDossier: string) {
    const valeur = numeroDossier.trim().toUpperCase();
    if (!valeur) return;
    setBusy(true);
    const { data } = await supabase
      .from("demande")
      .select("id_demande")
      .eq("numero_dossier", valeur)
      .maybeSingle();
    setBusy(false);
    if (!data) {
      toast(`Aucun dossier trouvé pour « ${valeur} ».`, "error");
      return;
    }
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
            ouvrirDossier(codes[0].rawValue);
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
          <p className="text-sm text-slate-500">Par numéro de dossier ou en scannant le QR du reçu bénéficiaire.</p>
        </div>
      </div>

      {/* Saisie manuelle */}
      <form
        className="card p-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          ouvrirDossier(num);
        }}
      >
        <label className="field-label">Numéro de dossier</label>
        <div className="flex gap-2">
          <input
            className="field-input font-mono"
            placeholder="PASS-2026-00001"
            value={num}
            onChange={(e) => setNum(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={busy || !num.trim()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Ouvrir
          </button>
        </div>
      </form>

      {/* Scan QR */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <QrCode size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Scanner le reçu</h2>
        </div>
        {!scanDisponible ? (
          <p className="text-sm text-slate-400">
            Le scan par caméra n'est pas pris en charge par ce navigateur. Utilisez la saisie du numéro ci-dessus.
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
