"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * QR Code gerado na hora a partir do texto (nada é salvo em disco ou no banco).
 * Nível de correção "M": continua legível mesmo com a etiqueta um pouco suja ou arranhada.
 */
export function QrCode({ texto, alt, className }: { texto: string; alt: string; className?: string }) {
  const [resultado, setResultado] = useState<{ texto: string; url: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(texto, { errorCorrectionLevel: "M", margin: 1, width: 512, color: { dark: "#000000", light: "#ffffff" } })
      .then((url) => {
        if (!cancelado) setResultado({ texto, url });
      })
      .catch(() => {
        if (!cancelado) setResultado(null);
      });
    return () => {
      cancelado = true;
    };
  }, [texto]);

  if (resultado?.texto !== texto) return <Skeleton className={cn("aspect-square", className)} />;
  // eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora (data URL)
  return <img src={resultado.url} alt={alt} className={cn("aspect-square bg-white", className)} />;
}

/** Endereço que o QR do equipamento abre: https://<domínio>/e/{id}. */
export function urlDoEquipamento(id: string): string {
  const origem = typeof window === "undefined" ? "" : window.location.origin;
  return `${origem}/e/${id}`;
}
