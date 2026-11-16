"use client";

import { Info, Printer, QrCode as IconeQr } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { QrCode, urlDoEquipamento } from "@/components/qr-code";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useEquipamentos, useLocais, useTipos, type EquipamentoResumo } from "@/lib/tecnico/data";

export function SeletorEtiquetas() {
  const { dados: equipamentos, erro, recarregar } = useEquipamentos({ incluirArquivados: false });
  const { dados: locais } = useLocais();
  const { dados: tipos } = useTipos();
  const idsDaUrl = useSearchParams().get("ids");

  // Vindo do detalhe do equipamento (?ids=...), já começa com ele marcado.
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set((idsDaUrl ?? "").split(",").filter(Boolean)),
  );

  const lista = useMemo(
    () => [...(equipamentos ?? [])].sort((a, b) => a.localNome.localeCompare(b.localNome, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR")),
    [equipamentos],
  );
  const marcados = useMemo(() => lista.filter((e) => selecionados.has(e.id)), [lista, selecionados]);

  function alternar(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }
  function marcarGrupo(grupo: EquipamentoResumo[]) {
    setSelecionados((atual) => new Set([...atual, ...grupo.map((e) => e.id)]));
  }

  if (!equipamentos) {
    if (erro) return <ErroAoCarregar mensagem={erro} aoTentar={recarregar} />;
    return <CarregandoLista />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 print:hidden">
        <Alert>
          <Info aria-hidden />
          <AlertTitle>O QR Code é opcional</AlertTitle>
          <AlertDescription>
            É só um atalho para abrir o equipamento com a câmera do celular. O caminho principal é procurar o equipamento na lista.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Escolha os equipamentos</CardTitle>
            <CardDescription>Marque um a um ou use os atalhos para marcar vários de uma vez.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => marcarGrupo(lista)} disabled={lista.length === 0}>
                Marcar todos ({lista.length})
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelecionados(new Set())} disabled={selecionados.size === 0}>
                Desmarcar todos
              </Button>
              <Field>
                <FieldLabel htmlFor="marcar-local">Marcar todos de um local</FieldLabel>
                <NativeSelect
                  id="marcar-local"
                  className="w-full"
                  value=""
                  onChange={(e) => marcarGrupo(lista.filter((q) => q.localId === e.target.value))}
                >
                  <NativeSelectOption value="">Escolha o local</NativeSelectOption>
                  {(locais ?? []).map((l) => (
                    <NativeSelectOption key={l.id} value={l.id}>
                      {l.nome}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="marcar-tipo">Marcar todos de um tipo</FieldLabel>
                <NativeSelect
                  id="marcar-tipo"
                  className="w-full"
                  value=""
                  onChange={(e) => marcarGrupo(lista.filter((q) => q.tipoId === e.target.value))}
                >
                  <NativeSelectOption value="">Escolha o tipo</NativeSelectOption>
                  {(tipos ?? []).map((t) => (
                    <NativeSelectOption key={t.id} value={t.id}>
                      {t.nome}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            {lista.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconeQr aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum equipamento para etiquetar</EmptyTitle>
                  <EmptyDescription>Cadastre equipamentos primeiro.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {lista.map((e) => (
                  <li key={e.id}>
                    <label
                      htmlFor={`sel-${e.id}`}
                      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 has-data-checked:border-primary has-data-checked:bg-accent"
                    >
                      <Checkbox
                        id={`sel-${e.id}`}
                        checked={selecionados.has(e.id)}
                        onCheckedChange={(v) => alternar(e.id, v === true)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{e.nome}</span>
                        <span className="block text-muted-foreground">
                          {e.localNome} · {e.tipoNome}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">2. Imprima</h2>
          <p className="text-muted-foreground">
            {marcados.length === 0
              ? "Marque pelo menos um equipamento para gerar as etiquetas."
              : `${marcados.length} etiqueta${marcados.length === 1 ? "" : "s"} na folha A4 abaixo. Na janela de impressão, deixe a escala em 100%.`}
          </p>
          <Button size="lg" className="w-full sm:w-auto sm:self-start" disabled={marcados.length === 0} onClick={() => window.print()}>
            <Printer aria-hidden />
            Imprimir
          </Button>
        </div>
      </div>

      {marcados.length > 0 && (
        <div className="overflow-x-auto print:overflow-visible">
          {/* Folha A4: 3 colunas de etiquetas. Na impressão ocupa a página inteira. */}
          <div
            aria-label="Etiquetas para imprimir"
            className="mx-auto grid w-[210mm] max-w-none grid-cols-3 border bg-white p-[8mm] shadow-sm print:m-0 print:w-full print:border-0 print:p-0 print:shadow-none"
          >
            {marcados.map((e) => (
              <div
                key={e.id}
                className="box-border flex h-[38mm] break-inside-avoid items-center gap-[3mm] border border-dashed border-neutral-400 p-[3mm] text-black"
              >
                <QrCode texto={urlDoEquipamento(e.id)} alt={`QR Code de ${e.nome}`} className="size-[30mm] shrink-0" />
                <div className="min-w-0 leading-tight">
                  <p className="line-clamp-3 text-[11pt] font-bold break-words">{e.nome}</p>
                  <p className="mt-1 line-clamp-2 text-[9pt]">{e.localNome}</p>
                  <p className="line-clamp-1 text-[9pt] text-neutral-700">{e.tipoNome}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
