"use client";

import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Download, ExternalLink, FileText, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SeletorData } from "@/components/seletor-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OpcoesRelatorio = {
  /** Só quando o técnico tem 2 ou mais clientes; com 1 cliente nada é perguntado. */
  clientes?: { id: string; nome: string }[];
  /** Portal: a empresa já está definida (o servidor só confirma; o usuário `cliente` nunca escolhe outra). */
  clienteFixoId?: string;
  locais: { id: string; nome: string; clienteId: string }[];
  tipos: { id: string; nome: string }[];
  equipamentos: { id: string; nome: string; localId: string; tipoId: string; clienteId: string }[];
};

type Atalho = "este_mes" | "mes_passado" | "tres_meses" | "personalizado";

const ATALHOS: { valor: Atalho; rotulo: string }[] = [
  { valor: "este_mes", rotulo: "Este mês" },
  { valor: "mes_passado", rotulo: "Mês passado" },
  { valor: "tres_meses", rotulo: "Últimos 3 meses" },
  { valor: "personalizado", rotulo: "Personalizado" },
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const TODOS = "todos";

function periodoDoAtalho(atalho: Exclude<Atalho, "personalizado">, hoje = new Date()): { inicio: string; fim: string } {
  if (atalho === "este_mes") return { inicio: iso(startOfMonth(hoje)), fim: iso(endOfMonth(hoje)) };
  if (atalho === "mes_passado") {
    const passado = subMonths(hoje, 1);
    return { inicio: iso(startOfMonth(passado)), fim: iso(endOfMonth(passado)) };
  }
  // Últimos 3 meses: de 3 meses atrás até hoje.
  return { inicio: iso(addMonths(hoje, -3)), fim: iso(hoje) };
}

type Pronto = { url: string; nome: string };

/** Tela de relatório (técnico e portal): período, filtros opcionais e "Gerar PDF". */
export function FormularioRelatorio({ opcoes }: { opcoes: OpcoesRelatorio }) {
  const [atalho, setAtalho] = useState<Atalho>("tres_meses");
  const [personalizado, setPersonalizado] = useState(() => periodoDoAtalho("este_mes"));
  const [clienteId, setClienteId] = useState<string>(opcoes.clientes?.[0]?.id ?? "");
  const [localId, setLocalId] = useState(TODOS);
  const [tipoId, setTipoId] = useState(TODOS);
  const [equipamentoId, setEquipamentoId] = useState(TODOS);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<Pronto | null>(null);
  const cartaoPronto = useRef<HTMLDivElement>(null);

  // No celular o aviso "Relatório pronto" fica abaixo do botão: leva a tela até ele.
  useEffect(() => {
    if (pronto) cartaoPronto.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [pronto]);

  const periodo = atalho === "personalizado" ? personalizado : periodoDoAtalho(atalho);
  const periodoInvalido = periodo.fim < periodo.inicio;

  // Só aparecem opções do cliente escolhido (quando o técnico tem mais de um cliente).
  const locais = useMemo(
    () => (opcoes.clientes ? opcoes.locais.filter((l) => l.clienteId === clienteId) : opcoes.locais),
    [opcoes.clientes, opcoes.locais, clienteId],
  );
  const equipamentos = useMemo(
    () =>
      opcoes.equipamentos.filter(
        (e) =>
          (!opcoes.clientes || e.clienteId === clienteId) &&
          (localId === TODOS || e.localId === localId) &&
          (tipoId === TODOS || e.tipoId === tipoId),
      ),
    [opcoes.clientes, opcoes.equipamentos, clienteId, localId, tipoId],
  );

  function mudarCliente(id: string) {
    setClienteId(id);
    setLocalId(TODOS);
    setEquipamentoId(TODOS);
  }

  function consulta() {
    const p = new URLSearchParams({ inicio: periodo.inicio, fim: periodo.fim });
    const empresa = opcoes.clientes ? clienteId : opcoes.clienteFixoId;
    if (empresa) p.set("clienteId", empresa);
    if (localId !== TODOS) p.set("localId", localId);
    if (tipoId !== TODOS) p.set("tipoId", tipoId);
    if (equipamentoId !== TODOS) p.set("equipamentoId", equipamentoId);
    return `/api/relatorios?${p.toString()}`;
  }

  async function gerar() {
    setErro(null);
    setPronto(null);
    setGerando(true);
    // Abre a aba já no clique (senão o navegador bloqueia a janela); se for bloqueada, o botão "Abrir PDF" aparece.
    const aba = window.open("", "_blank");
    if (aba) aba.document.title = "Gerando relatório…";
    try {
      const resposta = await fetch(consulta());
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(corpo?.erro ?? "Não foi possível gerar o PDF. Tente de novo.");
      }
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const nome = /filename="([^"]+)"/.exec(resposta.headers.get("Content-Disposition") ?? "")?.[1] ?? "relatorio-manutencoes.pdf";
      setPronto({ url, nome });
      if (aba) aba.location.href = url;
      toast.success("Relatório pronto");
    } catch (e) {
      aba?.close();
      const mensagem =
        e instanceof TypeError ? "Sem internet. Conecte-se e tente de novo." : e instanceof Error ? e.message : "Não foi possível gerar o PDF.";
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {opcoes.clientes && (
        <Field>
          <FieldLabel htmlFor="rel-cliente">Empresa</FieldLabel>
          <Select value={clienteId} onValueChange={mudarCliente}>
            <SelectTrigger id="rel-cliente" className="w-full">
              <SelectValue placeholder="Escolha a empresa" />
            </SelectTrigger>
            <SelectContent>
              {opcoes.clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {/* Período */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-bold">Período</legend>
        <div className="grid grid-cols-2 gap-3">
          {ATALHOS.map(({ valor, rotulo }) => (
            <Button
              key={valor}
              type="button"
              size="lg"
              variant={atalho === valor ? "default" : "outline"}
              aria-pressed={atalho === valor}
              onClick={() => setAtalho(valor)}
              className={cn("h-14 text-base", atalho !== valor && "border-2")}
            >
              {rotulo}
            </Button>
          ))}
        </div>

        {atalho === "personalizado" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rel-inicio">De</FieldLabel>
              <SeletorData
                id="rel-inicio"
                titulo="Data inicial do relatório"
                valor={personalizado.inicio}
                onChange={(v) => setPersonalizado((p) => ({ ...p, inicio: v }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rel-fim">Até</FieldLabel>
              <SeletorData
                id="rel-fim"
                titulo="Data final do relatório"
                valor={personalizado.fim}
                onChange={(v) => setPersonalizado((p) => ({ ...p, fim: v }))}
              />
            </Field>
          </div>
        )}

        <p className={cn("text-lg", periodoInvalido ? "font-semibold text-destructive" : "text-muted-foreground")}>
          {periodoInvalido
            ? "A data final não pode ser antes da data inicial."
            : `Serviços de ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`}
        </p>
      </fieldset>

      {/* Filtros opcionais */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-bold">
          Filtros <span className="font-normal text-muted-foreground">(se quiser)</span>
        </legend>
        <Field>
          <FieldLabel htmlFor="rel-local">Local</FieldLabel>
          <Select
            value={localId}
            onValueChange={(v) => {
              setLocalId(v);
              setEquipamentoId(TODOS);
            }}
          >
            <SelectTrigger id="rel-local" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os locais</SelectItem>
              {locais.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="rel-tipo">Tipo de equipamento</FieldLabel>
          <Select
            value={tipoId}
            onValueChange={(v) => {
              setTipoId(v);
              setEquipamentoId(TODOS);
            }}
          >
            <SelectTrigger id="rel-tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os tipos</SelectItem>
              {opcoes.tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="rel-equipamento">Equipamento</FieldLabel>
          <Select value={equipamentoId} onValueChange={setEquipamentoId}>
            <SelectTrigger id="rel-equipamento" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os equipamentos</SelectItem>
              {equipamentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </fieldset>

      {erro && (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>Não foi possível gerar o relatório</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        size="lg"
        className="h-16 w-full text-xl"
        disabled={gerando || periodoInvalido || (!!opcoes.clientes && !clienteId)}
        onClick={gerar}
      >
        {gerando ? <Spinner className="size-6" /> : <FileText className="size-6" aria-hidden />}
        {gerando ? "Gerando o PDF…" : "Gerar PDF"}
      </Button>

      {pronto && (
        <div ref={cartaoPronto} className="flex flex-col gap-3 rounded-xl border-2 border-em-dia-border bg-em-dia p-4 text-em-dia-foreground" role="status">
          <p className="text-lg font-bold">Relatório pronto</p>
          <p className="text-base break-all">{pronto.nome}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg" variant="outline" className="bg-background text-foreground">
              <a href={pronto.url} target="_blank" rel="noopener">
                <ExternalLink aria-hidden />
                Abrir PDF
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-background text-foreground">
              <a href={pronto.url} download={pronto.nome}>
                <Download aria-hidden />
                Baixar PDF
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
