"use client";

import { useSyncExternalStore } from "react";

/**
 * Instalação do app (PWA). No Android/Chrome o navegador avisa que dá para instalar (`beforeinstallprompt`)
 * uma vez só, cedo; guardamos o aviso aqui para a página "Instalar no celular" usar o botão quando quiser.
 */
type EventoInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let evento: EventoInstalacao | null = null;
let instalado = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());
let iniciado = false;

/** Começa a escutar (chamado uma vez, no layout do técnico). */
export function iniciarCapturaDeInstalacao(): void {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e as EventoInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    instalado = true;
    avisar();
  });
}

export function estaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  return instalado || window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function ehIphone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Abre o pedido de instalação do navegador (só se ele já avisou que pode). */
export async function instalarAgora(): Promise<"instalado" | "recusado" | "indisponivel"> {
  if (!evento) return "indisponivel";
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  evento = null;
  avisar();
  return outcome === "accepted" ? "instalado" : "recusado";
}

type Foto = { podeInstalar: boolean; instalado: boolean; iphone: boolean };
let ultima: Foto = { podeInstalar: false, instalado: false, iphone: false };
const SERVIDOR: Foto = { podeInstalar: false, instalado: false, iphone: false };

function foto(): Foto {
  const nova: Foto = { podeInstalar: evento !== null, instalado: estaInstalado(), iphone: ehIphone() };
  if (nova.podeInstalar !== ultima.podeInstalar || nova.instalado !== ultima.instalado || nova.iphone !== ultima.iphone) ultima = nova;
  return ultima;
}

/** Estado da instalação para a tela: se dá para instalar com um toque, se já está instalado, se é iPhone. */
export function useInstalacao(): Foto {
  return useSyncExternalStore(
    (aoMudar) => {
      ouvintes.add(aoMudar);
      return () => ouvintes.delete(aoMudar);
    },
    foto,
    () => SERVIDOR,
  );
}
