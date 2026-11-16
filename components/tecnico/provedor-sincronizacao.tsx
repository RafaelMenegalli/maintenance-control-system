"use client";

import { useEffect } from "react";
import { gravarMeta, lerMeta, META } from "@/lib/tecnico/data/banco";
import { iniciarCapturaDeInstalacao } from "@/lib/tecnico/instalacao";
import { iniciarGatilhos } from "@/lib/tecnico/sync";
import { atualizarEstado } from "@/lib/tecnico/sync/estado";

/**
 * Liga a sincronização enquanto o técnico usa o app: baixa os dados ao abrir, quando a internet volta,
 * quando a aba volta para a frente e a cada 5 minutos; sobe a fila de serviços; e pede ao navegador para
 * NÃO apagar os dados guardados (`navigator.storage.persist()`).
 * Fica no layout do /tecnico (Client Component). Não desenha nada.
 */
export function ProvedorSincronizacao({ usuario }: { usuario: { id: string; nome: string } }) {
  useEffect(() => {
    iniciarCapturaDeInstalacao();
    let desligar: (() => void) | undefined;
    let cancelado = false;

    (async () => {
      try {
        await gravarMeta(META.usuario, { id: usuario.id, nome: usuario.nome });
        const ultima = await lerMeta<string>(META.ultimaSincronizacao);
        if (ultima) atualizarEstado({ ultimaSincronizacao: ultima });
        // Primeiro uso: pede armazenamento "persistente" (o Safari do iPhone pode limpar dados de sites pouco usados).
        if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
      } catch {
        /* sem IndexedDB (ex.: janela privativa): o app segue online */
      }
      if (!cancelado) desligar = iniciarGatilhos();
    })();

    return () => {
      cancelado = true;
      desligar?.();
    };
  }, [usuario.id, usuario.nome]);

  return null;
}
