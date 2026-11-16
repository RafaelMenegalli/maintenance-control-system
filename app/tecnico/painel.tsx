"use client";

import { ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ChipsFiltro } from "@/components/chips-filtro";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { CartoesResumo } from "@/components/painel/cartoes-resumo";
import { ProximasManutencoes } from "@/components/painel/proximas-manutencoes";
import { BadgeTipoServico } from "@/components/servico/tipo-servico";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/format";
import {
  useClienteAutomatico,
  useEquipamentos,
  useLocais,
  useServicosRecentes,
  useTipos,
} from "@/lib/tecnico/data";
import { contarSituacoes, proximasManutencoes } from "@/lib/tecnico/data/filtros";

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

  const contagem = useMemo(() => (equipamentos ? contarSituacoes(equipamentos) : undefined), [equipamentos]);

  // As 10 manutenções mais urgentes: quem tem data de próxima manutenção, da mais antiga para a mais nova.
  const proximas = useMemo(() => proximasManutencoes(equipamentos ?? []), [equipamentos]);

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

      <CartoesResumo contagem={contagem} hrefDaSituacao={query} />

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

      {equipamentos && (
        <ProximasManutencoes equipamentos={proximas} hrefDoEquipamento={(id) => `/tecnico/equipamentos/${id}`} />
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
