"use client";

import { Clock, ScanLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { IconeTipo } from "@/components/icone-tipo";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { normalizarTexto, useEquipamentos, useServicosRecentes, type EquipamentoResumo } from "@/lib/tecnico/data";

/** Quantos equipamentos aparecem em "Usados recentemente". */
const RECENTES = 5;

/**
 * Escolha do equipamento para registrar um serviço (início → Registrar serviço → equipamento → formulário).
 * Busca instantânea (sem acento), com "Usados recentemente" no topo e atalho para o leitor de QR.
 */
export function EscolherEquipamento() {
  const router = useRouter();
  const { dados: equipamentos, erro, recarregar } = useEquipamentos({ incluirArquivados: false });
  const { dados: recentes } = useServicosRecentes(40);

  const ordenados = useMemo(
    () => [...(equipamentos ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [equipamentos],
  );

  // Equipamentos dos serviços mais recentes, sem repetir.
  const usadosRecentemente = useMemo(() => {
    const porId = new Map(ordenados.map((e) => [e.id, e]));
    const vistos = new Set<string>();
    const lista: EquipamentoResumo[] = [];
    for (const s of recentes ?? []) {
      const e = porId.get(s.equipamentoId);
      if (e && !vistos.has(e.id)) {
        vistos.add(e.id);
        lista.push(e);
      }
      if (lista.length >= RECENTES) break;
    }
    return lista;
  }, [recentes, ordenados]);

  if (!equipamentos) {
    return erro ? <ErroAoCarregar mensagem={erro} aoTentar={recarregar} /> : <CarregandoLista />;
  }

  function escolher(id: string) {
    router.push(`/tecnico/equipamentos/${id}/novo-servico`);
  }

  const item = (e: EquipamentoResumo, prefixo: string) => (
    <CommandItem
      key={`${prefixo}-${e.id}`}
      value={`${prefixo}-${e.id}`}
      keywords={[e.nome, e.localNome, e.tipoNome]}
      onSelect={() => escolher(e.id)}
      className="min-h-16 gap-3"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <IconeTipo nome={e.tipoIcone} className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg leading-tight font-semibold">{e.nome}</span>
        <span className="block text-muted-foreground">
          {e.localNome} · {e.tipoNome}
        </span>
      </span>
    </CommandItem>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button asChild size="lg" variant="outline" className="w-full">
        <Link href="/tecnico/escanear">
          <ScanLine aria-hidden />
          Escanear QR Code
        </Link>
      </Button>

      <p className="text-lg font-semibold">Qual equipamento você atendeu?</p>

      <Command
        className="rounded-xl! border-2 p-2"
        // Busca sem acento e sem diferenciar maiúsculas, por nome, local e tipo.
        filter={(valor, busca, palavras) => {
          const alvo = normalizarTexto(`${valor} ${(palavras ?? []).join(" ")}`);
          return normalizarTexto(busca)
            .split(/\s+/)
            .filter(Boolean)
            .every((t) => alvo.includes(t))
            ? 1
            : 0;
        }}
      >
        <CommandInput placeholder="Digite o nome, o local ou o tipo" autoFocus />
        <CommandList>
          <CommandEmpty>
            <span className="block py-6 text-center text-base text-muted-foreground">
              Nenhum equipamento encontrado. Confira o que você digitou.
            </span>
          </CommandEmpty>
          {usadosRecentemente.length > 0 && (
            <CommandGroup
              heading={
                <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Clock className="size-4" aria-hidden />
                  Usados recentemente
                </span>
              }
            >
              {usadosRecentemente.map((e) => item(e, "recente"))}
            </CommandGroup>
          )}
          <CommandGroup
            heading={<span className="text-base font-semibold text-foreground">Todos os equipamentos</span>}
          >
            {ordenados.map((e) => item(e, "todos"))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
