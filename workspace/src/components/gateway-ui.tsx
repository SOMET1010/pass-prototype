import { useState } from "react";
import { Send, Copy, Check, Radio, Settings2, ShieldAlert, Loader2 } from "lucide-react";
import { Modale } from "./ui";
import {
  Canal, CANAUX, Envoi, envoyerNotification, getGatewayConfig, setGatewayConfig, gatewayConfiguree, Resultat,
} from "../lib/gateway";

// ─────────────────────────────────────────── Réglages de la passerelle ANSUT
export function GatewaySettings({ onClose }: { onClose: () => void }) {
  const cfg = getGatewayConfig();
  const [url, setUrl] = useState(cfg.url);
  const [token, setToken] = useState(cfg.token);
  const [apikey, setApikey] = useState(cfg.apikey ?? "");
  const [test, setTest] = useState<Resultat | null>(null);
  const [testTo, setTestTo] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const sauver = () => { setGatewayConfig({ url, token, apikey: apikey || undefined }); onClose(); };
  const tester = async () => {
    setGatewayConfig({ url, token, apikey: apikey || undefined });
    setEnvoi(true);
    setTest(await envoyerNotification({ channel: "email", to: testTo, subject: "Test — Pilotage PASS", content: "Message de test depuis le workspace de pilotage PASS.", ishtml: false }));
    setEnvoi(false);
  };

  return (
    <Modale titre="Passerelle de notifications ANSUT" onClose={onClose} large>
      <div className="space-y-4 text-sm">
        <p className="text-xs text-slate-500">
          Connecte l'outil au Hub ANSUT (fonction <code>ansut-notify</code>) pour envoyer réellement les
          notifications — e-mail, SMS, Telegram, WhatsApp. La configuration reste dans votre navigateur.
        </p>
        <div className="rounded-lg bg-amber-50 text-amber-800 p-3 text-xs flex items-start gap-1.5">
          <ShieldAlert size={14} className="shrink-0 mt-0.5" />
          Utilisez de préférence le jeton d'un compte <strong>admin</strong> du hub. N'utilisez pas la clé
          <code> service_role</code> ici : elle ne doit pas circuler dans un navigateur.
        </div>
        <div>
          <label className="field-label">URL de la fonction</label>
          <input className="field-input font-mono text-xs" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Jeton Bearer (JWT admin)</label>
          <input className="field-input font-mono text-xs" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="eyJ…" />
        </div>
        <div>
          <label className="field-label">apikey (optionnel — clé publishable/anon du hub)</label>
          <input className="field-input font-mono text-xs" type="password" value={apikey} onChange={(e) => setApikey(e.target.value)} placeholder="sb_publishable_… (défaut : jeton ci-dessus)" />
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-2">Test d'envoi (e-mail)</div>
          <div className="flex gap-2">
            <input className="field-input" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="adresse@exemple.ci" />
            <button className="btn-ghost" disabled={!testTo || !token || envoi} onClick={tester}>
              {envoi ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Tester
            </button>
          </div>
          {test && <p className={`mt-2 text-xs ${test.ok ? "text-emerald-600" : "text-red-600"}`}>{test.ok ? "✓ " : "✗ "}{test.message}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={sauver}>Enregistrer</button>
        </div>
      </div>
    </Modale>
  );
}

// ─────────────────────────────────────────── Modale d'envoi d'une notification
export function Notifier({ titre, defautTo, defautSubject, defautContent, defautCanal = "email", onClose }: {
  titre: string; defautTo: string; defautSubject: string; defautContent: string; defautCanal?: Canal; onClose: () => void;
}) {
  const [canal, setCanal] = useState<Canal>(defautCanal);
  const [to, setTo] = useState(defautTo);
  const [subject, setSubject] = useState(defautSubject);
  const [content, setContent] = useState(defautContent);
  const [tplNom, setTplNom] = useState("");
  const [tplLangue, setTplLangue] = useState("fr");
  const [res, setRes] = useState<Resultat | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [copie, setCopie] = useState(false);
  const configuree = gatewayConfiguree();

  const envoyer = async () => {
    setEnvoi(true); setRes(null);
    let payload: Envoi;
    if (canal === "email") payload = { channel: "email", to, subject, content, ishtml: false };
    else if (canal === "sms") payload = { channel: "sms", to, content };
    else if (canal === "telegram") payload = { channel: "telegram", to, content };
    else payload = { channel: "whatsapp", to, whatsAppTemplate: { name: tplNom, languageCode: tplLangue } };
    setRes(await envoyerNotification(payload));
    setEnvoi(false);
  };
  const texteComplet = `${canal === "email" ? `Objet : ${subject}\n\n` : ""}${content}`;

  return (
    <Modale titre={titre} onClose={onClose} large>
      <div className="space-y-3 text-sm">
        <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 w-fit">
          {CANAUX.map((c) => (
            <button key={c.id} onClick={() => setCanal(c.id)} className={`btn btn-sm ${canal === c.id ? "bg-pass-blue text-white" : "text-slate-500"}`}>{c.label}</button>
          ))}
        </div>

        <div>
          <label className="field-label">Destinataire{canal === "sms" || canal === "whatsapp" ? " (numéro)" : canal === "telegram" ? " (chat / numéro)" : " (e-mail)"}</label>
          <input className="field-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder={canal === "email" ? "adresse@exemple.ci" : "+225…"} />
        </div>

        {canal === "email" && (
          <div><label className="field-label">Objet</label><input className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        )}

        {canal === "whatsapp" ? (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Modèle approuvé</label><input className="field-input" value={tplNom} onChange={(e) => setTplNom(e.target.value)} placeholder="nom_du_template" /></div>
            <div><label className="field-label">Langue</label><input className="field-input" value={tplLangue} onChange={(e) => setTplLangue(e.target.value)} /></div>
          </div>
        ) : (
          <div>
            <label className="field-label">Message {canal === "sms" && <span className="text-slate-400">({content.length}/160)</span>}</label>
            <textarea className="field-input min-h-[140px]" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        )}

        {res && <p className={`text-xs ${res.ok ? "text-emerald-600" : "text-red-600"}`}>{res.ok ? "✓ " : "✗ "}{res.message}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(texteComplet); setCopie(true); }}>
            {copie ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
          </button>
          <div className="flex gap-2">
            {!configuree && <span className="self-center text-xs text-amber-600">Passerelle non configurée</span>}
            <button className="btn-primary" disabled={envoi || !configuree || (canal === "whatsapp" ? !tplNom : !content) || !to} onClick={envoyer}>
              {envoi ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />} Envoyer via Hub ANSUT
            </button>
          </div>
        </div>
      </div>
    </Modale>
  );
}

export function BoutonReglages() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button onClick={() => setOuvert(true)} className="btn btn-sm bg-white/10 text-white/80 hover:bg-white/20 w-full">
        <Settings2 size={13} /> Passerelle ANSUT {gatewayConfiguree() ? "✓" : ""}
      </button>
      {ouvert && <GatewaySettings onClose={() => setOuvert(false)} />}
    </>
  );
}
