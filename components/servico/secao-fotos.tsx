"use client";

import { Camera, ImagePlus, Trash2, TriangleAlert } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { MomentoFoto } from "@/db/schema";

/** Foto escolhida no formulário (ainda não enviada). */
export type FotoLocal = {
  id: string;
  momento: MomentoFoto;
  /** Arquivo já comprimido; `null` enquanto comprime ou se deu erro. */
  arquivo: Blob | null;
  previewUrl: string;
  estado: "comprimindo" | "pronta" | "erro";
  mensagemErro?: string;
};

/** Foto que já está salva no servidor (ao editar um serviço). */
export type FotoExistente = { id: string; momento: MomentoFoto; removida: boolean };

export const MAX_FOTOS_POR_MOMENTO = 8;

type Props = {
  momento: MomentoFoto;
  titulo: string;
  descricao: string;
  novas: FotoLocal[];
  existentes: FotoExistente[];
  aoAdicionar: (momento: MomentoFoto, arquivos: File[]) => void;
  aoRemoverNova: (id: string) => void;
  aoAlternarExistente: (id: string) => void;
};

/** Uma seção de fotos ("Antes" ou "Depois"): tirar foto, escolher da galeria, miniaturas grandes. */
export function SecaoFotos({
  momento,
  titulo,
  descricao,
  novas,
  existentes,
  aoAdicionar,
  aoRemoverNova,
  aoAlternarExistente,
}: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const visiveis = existentes.filter((e) => !e.removida).length + novas.length;
  const cheio = visiveis >= MAX_FOTOS_POR_MOMENTO;

  function escolheu(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite escolher a mesma foto de novo
    if (arquivos.length > 0) aoAdicionar(momento, arquivos.slice(0, MAX_FOTOS_POR_MOMENTO - visiveis));
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border-2 p-4" aria-labelledby={`fotos-${momento}`}>
      <div>
        <h3 id={`fotos-${momento}`} className="text-lg font-bold">
          {titulo}
        </h3>
        <p className="text-muted-foreground">{descricao}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" disabled={cheio} onClick={() => camera.current?.click()}>
          <Camera aria-hidden />
          Tirar foto
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={cheio} onClick={() => galeria.current?.click()}>
          <ImagePlus aria-hidden />
          Escolher da galeria
        </Button>
        <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={escolheu} />
        <input ref={galeria} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={escolheu} />
      </div>
      {cheio && <p className="text-muted-foreground">Limite de {MAX_FOTOS_POR_MOMENTO} fotos nesta seção.</p>}

      {visiveis === 0 && existentes.every((e) => e.removida) && novas.length === 0 && (
        <p className="text-muted-foreground">Nenhuma foto ainda. As fotos não são obrigatórias.</p>
      )}

      <ul className="grid grid-cols-2 gap-3">
        {existentes.map((f) => (
          <li key={f.id} className="flex flex-col gap-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto protegida servida pela API */}
              <img
                src={`/api/fotos/${f.id}?tamanho=miniatura`}
                alt={`Foto de ${titulo.toLowerCase()}`}
                className={`size-full object-cover ${f.removida ? "opacity-30" : ""}`}
              />
              {f.removida && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70 p-2 text-center font-semibold">
                  Será removida
                </span>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => aoAlternarExistente(f.id)}>
              <Trash2 aria-hidden />
              {f.removida ? "Manter foto" : "Remover"}
            </Button>
          </li>
        ))}
        {novas.map((f) => (
          <li key={f.id} className="flex flex-col gap-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob) */}
              <img src={f.previewUrl} alt={`Foto nova de ${titulo.toLowerCase()}`} className="size-full object-cover" />
              {f.estado === "comprimindo" && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 font-semibold">
                  <Spinner className="size-6" />
                  Preparando...
                </span>
              )}
              {f.estado === "erro" && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/85 p-2 text-center font-semibold text-destructive">
                  <TriangleAlert aria-hidden />
                  {f.mensagemErro ?? "Não foi possível usar esta foto."}
                </span>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => aoRemoverNova(f.id)}>
              <Trash2 aria-hidden />
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
