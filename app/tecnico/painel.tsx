"use client";

import { ChevronRight, CircleAlert, CircleDashed, ClipboardList, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ChipsFiltro } from "@/components/chips-filtro";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { IconeTipo } from "@/components/icone-tipo";
import { BadgeTipoServico } from "@/components/servico/tipo-servico";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatarData, formatarNumero } from "@/lib/format";
import type { StatusEquipamento } from "@/lib/status";
import {
  useClienteAutomatico,
  useEquipamentos,
  useLocais,
  useServicosRecentes,
  useTipos,
} from "@/lib/tecnico/data";
import { cn } from "@/lib/utils";

/** Hora local do aparelho; `null` no servidor (evita diferença entre servidor e navegador). */
function useHora(): number | null {
  return useSyncExternalStore(
    () => () => {},
    () => new Date().getHours(),
    () => null,
  );
}

function saudacao(hora: number | null): string {
  if (hora === null) return "Olá";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

const CARTOES: {
  status: Extract<StatusEquipamento, "vencido" | "vence_em_breve" | "sem_registro">;
  titulo: string;
  classes: string;
  Icone: typeof CircleAlert;
}[] = [
  { status: "vencido", titulo: "Vencidos", classes: "border-vencido-border bg-vencido text-vencido-foreground", Icone: CircleAlert },
  { status: "vence_em_breve", titulo: "Vencem em até 15 dias", classes: "border-vence-em-breve-border bg-vence-em-breve text-vence-em-breve-foreground", Icone: Clock },
  { status: "sem_registro", titulo: "Sem registro", classes: "border-sem-registro-border bg-sem-registro text-sem-registro-foreground", Icone: CircleDashed },
];

export function Painel({ primeiroNome }: { primeiroNome: string }) {
  const hora = useHora();
  const [tipoId, setTipoId] = useState<string>();
  const [localId, setLocalId] = useState<string>();
  const filtros = useMemo(() => ({ tipoId, localId, incluirArquivados: false }), [tipoId, localId]);

  const { dados: equipamentos, erro, recarregar } = useEquipamentos(filtros);
  const { dados: tipos } = useTipos();
  const { dados: locais } = useLocais();
  const { dados: ultimos } = useServicosRecentes(5);
  const { precisaEscolher } = useClienteAutomatico();

  const contagem = useMemo(() => {
    const c = { vencido: 0, vence_em_breve: 0, sem_registro: 0 };
    for (const e of equipamentos ?? []) {
      if (e.status in c) c[e.status as keyof typeof c] += 1;
    }
    return c;
  }, [equipamentos]);

  // As 10 manutenções mais urgentes: quem tem data de próxima manutenção, da mais antiga para a mais nova.
  const proximas = useMemo(
    () =>
      (equipamentos ?? [])
        .filter((e) => e.proximaData)
        .sort((a, b) => a.proximaData!.localeCompare(b.proximaData!) || a.nome.localeCompare(b.nome, "pt-BR"))
        .slice(0, 10),
    [equipamentos],
  );

  const query = (status: string) => {
    const p = new URLSearchParams({ situacao: status });
    if (tipoId) p.set("tipo", tipoId);
    if (localId) p.set("local", localId);
    return `/tecnico/equipamentos?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">
          {saudacao(hora)}, {primeiroNome}
        </h2>
        <Button asChild size="lg" className="h-16 w-full text-xl">
          <Link href="/tecnico/servicos/novo">
            <ClipboardList className="size-7" aria-hidden />
            Registrar serviço
          </Link>
        </Button>
      </div>

      {/* Cartões com os números */}
      <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-3">
        {CARTOES.map(({ status, titulo, classes, Icone }) => (
          <Link
            key={status}
            href={query(status)}
            className={cn("flex items-center gap-4 rounded-xl border-2 p-4 transition-opacity hover:opacity-90 sm:flex-col sm:items-start sm:gap-2", classes)}
          >
            <Icone className="size-8 shrink-0" aria-hidden />
            <span className="flex flex-1 items-center justify-between gap-3 sm:w-full sm:flex-col sm:items-start sm:gap-0">
              <span className="text-lg leading-tight font-semibold">{titulo}</span>
              <span className="text-4xl leading-none font-bold" aria-label={`${contagem[status]} equipamentos`}>
                {equipamentos ? formatarNumero(contagem[status], 0) : "…"}
              </span>
            </span>
            <ChevronRight className="size-6 shrink-0 sm:hidden" aria-hidden />
          </Link>
        ))}
      </section>

      {/* Filtros */}
      <section aria-label="Filtros" className="flex flex-col gap-4">
        <ChipsFiltro
          rotulo="Tipo de equipamento"
          opcoes={(tipos ?? []).filter((t) => t.ativo).map((t) => ({ valor: t.id, rotulo: t.nome }))}
          valor={tipoId}
          aoMudar={setTipoId}
        />
        <ChipsFiltro
          rotulo="Local"
          opcoes={(locais ?? []).map((l) => ({ valor: l.id, rotulo: precisaEscolher ? `${l.clienteNome} › ${l.nome}` : l.nome }))}
          valor={localId}
          aoMudar={setLocalId}
        />
      </section>

      {!equipamentos && (erro ? <ErroAoCarregar mensagem={erro} aoTentar={recarregar} /> : <CarregandoLista linhas={3} />)}

      {/* Próximas manutenções */}
      {equipamentos && (
        <section aria-labelledby="titulo-proximas" className="flex flex-col gap-3">
          <h2 id="titulo-proximas" className="text-xl font-bold">
            Próximas manutenções
          </h2>
          {proximas.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed p-4 text-muted-foreground">
              Nenhuma manutenção agendada ainda. Registre um serviço para o sistema calcular a próxima data.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {proximas.map((e) => (
                <li key={e.id}>
                  <Link href={`/tecnico/equipamentos/${e.id}`} className="flex items-center gap-3 rounded-xl border-2 bg-card p-3 hover:bg-muted/50">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                      <IconeTipo nome={e.tipoIcone} className="size-7" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-lg leading-tight font-semibold">{e.nome}</span>
                      <span className="text-muted-foreground">
                        {e.localNome} · {formatarData(e.proximaData)}
                      </span>
                      <span>
                        <StatusBadge status={e.status} proximaData={e.proximaData} />
                      </span>
                    </span>
                    <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Últimos serviços */}
      <section aria-labelledby="titulo-ultimos" className="flex flex-col gap-3">
        <h2 id="titulo-ultimos" className="text-xl font-bold">
          Últimos serviços registrados
        </h2>
        {!ultimos ? (
          <CarregandoLista linhas={2} />
        ) : ultimos.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed p-4 text-muted-foreground">Nenhum serviço registrado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ultimos.map((s) => (
              <li key={s.id}>
                <Link href={`/tecnico/equipamentos/${s.equipamentoId}`} className="flex items-center gap-3 rounded-xl border-2 bg-card p-3 hover:bg-muted/50">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-lg leading-tight font-semibold">{s.equipamentoNome}</span>
                    <span className="text-muted-foreground">
                      {s.localNome} · {formatarData(s.data)}
                    </span>
                    <span>
                      <BadgeTipoServico tipo={s.tipo} />
                    </span>
                  </span>
                  <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
