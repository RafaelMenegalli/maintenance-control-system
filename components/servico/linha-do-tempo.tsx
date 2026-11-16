"use client";

import { CircleCheck, ClipboardList, MoreVertical, Pencil, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { BadgeTipoServico } from "@/components/servico/tipo-servico";
import { VisualizadorFotos } from "@/components/servico/visualizador-fotos";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarData } from "@/lib/format";
import { resumirChecklist } from "@/lib/servicos/checklist";
import { repositorio, useServicos, type ServicoDetalhe } from "@/lib/tecnico/data";
import { cn } from "@/lib/utils";

const ROTULO_RESULTADO = { ok: "OK", nao_ok: "Não OK", na: "N/A" } as const;
const CLASSE_RESULTADO = {
  ok: "border-em-dia-border bg-em-dia text-em-dia-foreground",
  nao_ok: "border-vencido-border bg-vencido text-vencido-foreground",
  na: "border-sem-registro-border bg-sem-registro text-sem-registro-foreground",
} as const;

/** Linha do tempo vertical dos serviços do equipamento, do mais recente para o mais antigo. */
export function LinhaDoTempo({ equipamentoId }: { equipamentoId: string }) {
  const { dados: servicos, erro, recarregar } = useServicos(equipamentoId);
  const [fotoAberta, setFotoAberta] = useState<{ fotos: ServicoDetalhe["fotos"]; indice: number } | null>(null);
  const [excluindo, setExcluindo] = useState<ServicoDetalhe | null>(null);

  if (!servicos) {
    return erro ? <ErroAoCarregar mensagem={erro} aoTentar={recarregar} /> : <CarregandoLista linhas={2} />;
  }

  if (servicos.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed p-4">
        <p className="text-muted-foreground">Nenhum serviço registrado neste equipamento ainda.</p>
        <Button asChild>
          <Link href={`/tecnico/equipamentos/${equipamentoId}/novo-servico`}>
            <ClipboardList aria-hidden />
            Registrar o primeiro serviço
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ol className="flex flex-col">
        {servicos.map((s, i) => {
          const resumo = resumirChecklist(s.checklist);
          const ultimo = i === servicos.length - 1;
          return (
            <li key={s.id} className="relative flex gap-3 pb-4">
              {/* Linha e bolinha da linha do tempo */}
              <div className="flex flex-col items-center" aria-hidden>
                <span className="mt-2 size-4 shrink-0 rounded-full border-4 border-primary bg-background" />
                {!ultimo && <span className="w-0.5 flex-1 bg-border" />}
              </div>

              <div className="min-w-0 flex-1 rounded-xl border-2 bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-lg leading-tight font-bold">{formatarData(s.data)}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <BadgeTipoServico tipo={s.tipo} />
                    </div>
                    <p className="text-muted-foreground">
                      {s.criadoPorNome ? `Registrado por ${s.criadoPorNome}` : "Registrado pelo técnico"}
                    </p>
                  </div>

                  {/* Editar e excluir: só no computador (exigem internet). */}
                  <div className="hidden shrink-0 md:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical aria-hidden />
                          Opções
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/tecnico/equipamentos/${equipamentoId}/servicos/${s.id}/editar`}>
                            <Pencil aria-hidden />
                            Editar serviço
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setExcluindo(s)}>
                          <Trash2 aria-hidden />
                          Excluir serviço
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Resumo do checklist em destaque */}
                <div className="mt-3">
                  {resumo.total === 0 ? (
                    <span className="text-muted-foreground">Sem checklist</span>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-2 text-base font-semibold",
                        resumo.temProblema
                          ? "border-vencido-border bg-vencido text-vencido-foreground"
                          : "border-em-dia-border bg-em-dia text-em-dia-foreground",
                      )}
                    >
                      {resumo.temProblema ? <TriangleAlert className="size-4" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />}
                      {resumo.texto}
                    </Badge>
                  )}
                </div>

                {/* Miniaturas */}
                {s.fotos.length > 0 && (
                  <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {s.fotos.map((f, k) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => setFotoAberta({ fotos: s.fotos, indice: k })}
                          className="relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted"
                          aria-label={`Abrir foto de ${f.momento === "antes" ? "antes" : "depois"}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- foto protegida servida pela API */}
                          <img
                            src={`/api/fotos/${f.id}?tamanho=miniatura`}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-sm font-semibold text-white">
                            {f.momento === "antes" ? "Antes" : "Depois"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Descrição e detalhes */}
                {s.descricao && <p className="mt-3 line-clamp-2 whitespace-pre-line">{s.descricao}</p>}
                <Accordion type="single" collapsible className="mt-1">
                  <AccordionItem value="detalhes" className="border-b-0">
                    <AccordionTrigger className="min-h-12 text-base font-semibold text-primary">Ver detalhes</AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-3 text-base">
                      {s.descricao && (
                        <div>
                          <p className="font-semibold">O que foi feito</p>
                          <p className="whitespace-pre-line">{s.descricao}</p>
                        </div>
                      )}
                      {s.checklist.length > 0 && (
                        <div>
                          <p className="font-semibold">Checklist</p>
                          <ul className="mt-1 flex flex-col gap-2">
                            {s.checklist.map((c) => (
                              <li key={c.key} className="flex flex-col gap-1">
                                <span className="flex items-start justify-between gap-2">
                                  <span>{c.label}</span>
                                  <Badge variant="outline" className={cn("shrink-0 border-2 font-semibold", CLASSE_RESULTADO[c.resultado])}>
                                    {ROTULO_RESULTADO[c.resultado]}
                                  </Badge>
                                </span>
                                {c.observacao && <span className="text-muted-foreground">Obs.: {c.observacao}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {s.proximaData && (
                        <p>
                          <span className="font-semibold">Próxima manutenção prevista: </span>
                          {formatarData(s.proximaData)}
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </li>
          );
        })}
      </ol>

      <VisualizadorFotos
        fotos={fotoAberta?.fotos ?? []}
        indiceInicial={fotoAberta?.indice ?? null}
        aoFechar={() => setFotoAberta(null)}
      />

      {excluindo && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setExcluindo(null)}
          destrutivo
          titulo="Excluir este serviço?"
          descricao={`O serviço de ${formatarData(excluindo.data)} será apagado junto com o checklist e as ${excluindo.fotos.length} foto(s). Isso muda a data da próxima manutenção do equipamento. Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Excluir serviço"
          onConfirmar={async () => {
            try {
              await repositorio.excluirServico(excluindo.id);
              toast.success("Serviço excluído");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
              throw e;
            }
          }}
        />
      )}
    </>
  );
}
