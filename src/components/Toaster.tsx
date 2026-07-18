import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let counter = 0;

/** Émet une notification. Utilisable depuis n'importe où (découplé du rendu). */
export function toast(message: string, type: ToastType = "info") {
  window.dispatchEvent(new CustomEvent("pass-toast", { detail: { message, type } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { message: string; type: ToastType };
      const id = ++counter;
      setItems((prev) => [...prev, { id, ...detail }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5000);
    }
    window.addEventListener("pass-toast", handler);
    return () => window.removeEventListener("pass-toast", handler);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 no-print">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex max-w-md items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg border ${
            t.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : t.type === "error"
                ? "bg-red-50 border-red-300 text-red-800"
                : "bg-white border-slate-300 text-slate-700"
          }`}
        >
          {t.type === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : t.type === "error" ? (
            <XCircle size={18} className="mt-0.5 shrink-0" />
          ) : (
            <Info size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
