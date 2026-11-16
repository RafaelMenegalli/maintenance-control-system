"use client";

import { Download, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const CHAVE = "sugestao-instalar-dispensada";

/**
 * Na primeira vez que o técnico entra pelo celular (e o app ainda não está instalado), sugere instalar.
 * Some de vez com "Agora não" ou ao tocar em "Ver como instalar".
 */
function deveSugerir(): boolean {
  try {
    const celular = window.matchMedia("(max-width: 767px)").matches;
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    return celular && !instalado && !localStorage.getItem(CHAVE);
  } catch {
    return false; // sem localStorage: não sugere
  }
}

export function SugestaoInstalar() {
  // No servidor nunca mostra; no navegador decide pelo aparelho (sem setState em efeito).
  const sugerir = useSyncExternalStore(
    () => () => {},
    deveSugerir,
    () => false,
  );
  const [dispensada, setDispensada] = useState(false);

  function dispensar() {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      /* ignora */
    }
    setDispensada(true);
  }

  if (!sugerir || dispensada) return null;
  return (
    <div
      role="region"
      aria-label="Instalar o aplicativo"
      className="fixed inset-x-3 bottom-20 z-40 flex flex-col gap-3 rounded-xl border-2 border-primary bg-background p-4 shadow-lg md:hidden print:hidden"
    >
      <p className="text-lg font-semibold">Instale o aplicativo no celular para usar mesmo sem internet.</p>
      <div className="flex flex-col gap-3">
        <Button asChild size="lg" onClick={dispensar}>
          <Link href="/tecnico/instalar">
            <Download aria-hidden />
            Ver como instalar
          </Link>
        </Button>
        <Button size="lg" variant="outline" onClick={dispensar}>
          <X aria-hidden />
          Agora não
        </Button>
      </div>
    </div>
  );
}
