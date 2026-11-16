"use client";

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight, CheckCheck, Pencil, Save, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { SeletorData } from "@/components/seletor-data";
import { ICONES_TIPO_SERVICO } from "@/components/servico/tipo-servico";
import { SecaoFotos, type FotoExistente, type FotoLocal } from "@/components/servico/secao-fotos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { comprimirFoto } from "@/lib/fotos/comprimir";
import { formatarData, formatarDias } from "@/lib/format";
import type { RespostaChecklist, ResultadoChecklist } from "@/lib/schemas/checklist";
import { ROTULOS_TIPO_SERVICO, TIPOS_SERVICO, type TipoServicoValor } from "@/lib/schemas/entidades";
import { resumirChecklist } from "@/lib/servicos/checklist";
import {
  repositorio,
  useEquipamento,
  useServicos,
  type EquipamentoDetalhe,
  type ProgressoEnvio,
  type ServicoDetalhe,
} from "@/lib/tecnico/data";
import { cn } from "@/lib/utils";

// ───────────────────────── Carregamento ─────────────────────────

type Props = {
  equipamentoId: string;
  /** Se informado, edita este serviço; senão registra um novo. */
  servicoId?: string;
};

export function FormularioServico({ equipamentoId, servicoId }: Props) {
  return servicoId ? (
    <Edicao equipamentoId={equipamentoId} servicoId={servicoId} />
  ) : (
    <Novo equipamentoId={equipamentoId} />
  );
}

function Novo({ equipamentoId }: { equipamentoId: string }) {
  const { dados: equipamento, erro, recarregar } = useEquipamento(equipamentoId);
  if (equipamento === undefined) {
    return erro ? <ErroAoCarregar mensagem={erro} aoTentar={recarregar} /> : <CarregandoLista linhas={3} />;
  }
  if (equipamento === null) return <NaoEncontrado />;
  return <FormularioInterno equipamento={equipamento} />;
}

function Edicao({ equipamentoId, servicoId }: { equipamentoId: string; servicoId: string }) {
  const eq = useEquipamento(equipamentoId);
  const sv = useServicos(equipamentoId);
  if (eq.dados === undefined || sv.dados === undefined) {
    const erro = eq.erro ?? sv.erro;
    return erro ? (
      <ErroAoCarregar mensagem={erro} aoTentar={() => (eq.recarregar(), sv.recarregar())} />
    ) : (
      <CarregandoLista linhas={3} />
    );
  }
  const servico = sv.dados.find((s) => s.id === servicoId);
  if (!eq.dados || !servico) return <NaoEncontrado />;
  return <FormularioInterno equipamento={eq.dados} servico={servico} />;
}

function NaoEncontrado() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Não encontrado</AlertTitle>
      <AlertDescription>Este equipamento ou serviço não existe mais. Volte e tente de novo.</AlertDescription>
    </Alert>
  );
}

// ───────────────────────── Formulário ─────────────────────────

type IdEtapa = "tipo" | "checklist" | "fotos" | "descricao" | "revisao";
type RespostaForm = { resultado?: ResultadoChecklist; observacao: string };
type Erros = Partial<Record<"tipo" | "data" | "checklist" | "fotos" | "descricao" | "proxima", string>>;

const TITULOS: Record<IdEtapa, string> = {
  tipo: "O que foi feito",
  checklist: "Checklist",
  fotos: "Fotos",
  descricao: "Descrição e próxima data",
  revisao: "Revisão final",
};

const hojeIso = () => format(new Date(), "yyyy-MM-dd");

function FormularioInterno({ equipamento, servico }: { equipamento: EquipamentoDetalhe; servico?: ServicoDetalhe }) {
  const router = useRouter();
  const editando = !!servico;

  // O id do serviço nasce AQUI, no navegador, quando o formulário abre (preparação para o offline).
  const [servicoId] = useState(() => servico?.id ?? crypto.randomUUID());

  // Itens do checklist: no registro novo, os atuais do tipo; ao editar, os do próprio serviço (snapshot).
  const itens = useMemo(
    () =>
      servico
        ? servico.checklist.map((r) => ({ key: r.key, label: r.label }))
        : equipamento.checklist.map((i) => ({ key: i.key, label: i.label })),
    [servico, equipamento.checklist],
  );

  const [tipo, setTipo] = useState<TipoServicoValor | "">(servico?.tipo ?? "");
  const [data, setData] = useState(servico?.data ?? hojeIso());
  const [respostas, setRespostas] = useState<Record<string, RespostaForm>>(() =>
    Object.fromEntries(
      (servico?.checklist ?? []).map((r) => [r.key, { resultado: r.resultado, observacao: r.observacao ?? "" }]),
    ),
  );
  const [novas, setNovas] = useState<FotoLocal[]>([]);
  const [existentes, setExistentes] = useState<FotoExistente[]>(
    () => servico?.fotos.map((f) => ({ id: f.id, momento: f.momento, removida: false })) ?? [],
  );
  const [descricao, setDescricao] = useState(servico?.descricao ?? "");
  // A próxima data é calculada (data + periodicidade) a não ser que a pessoa escolha outra.
  const [proximaManual, setProximaManual] = useState<string | null>(() =>
    servico?.proximaData && servico.proximaData !== padraoDaProxima(servico.data, equipamento.periodicidadeDias)
      ? servico.proximaData
      : null,
  );

  const [indice, setIndice] = useState(0);
  const [erros, setErros] = useState<Erros>({});
  const [tocou, setTocou] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoEnvio | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [saidaPendente, setSaidaPendente] = useState<string | null>(null);
  const enviandoRef = useRef(false);

  const etapas = useMemo<IdEtapa[]>(
    () => (itens.length > 0 ? ["tipo", "checklist", "fotos", "descricao", "revisao"] : ["tipo", "fotos", "descricao", "revisao"]),
    [itens.length],
  );
  const etapa = etapas[indice];
  const totalPassos = etapas.length - 1;
  const ultima = indice === etapas.length - 1;

  const proximaPadrao = padraoDaProxima(data, equipamento.periodicidadeDias);
  const proxima = proximaManual ?? proximaPadrao;
  const diasAteProxima = differenceInCalendarDays(parseISO(proxima), parseISO(data));

  const voltarParaEquipamento = `/tecnico/equipamentos/${equipamento.id}`;

  // ── Saída com dados preenchidos: pede confirmação ──
  const protegido = tocou && !salvo;
  useEffect(() => {
    if (!protegido) return;
    const antesDeFechar = (e: BeforeUnloadEvent) => e.preventDefault();
    // Intercepta qualquer link interno (menu, barra inferior, botão Voltar do cabeçalho).
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;
      if (a.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setSaidaPendente(a.pathname + a.search);
    };
    window.addEventListener("beforeunload", antesDeFechar);
    document.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeFechar);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [protegido]);

  // Libera as pré-visualizações (blob) ao sair.
  const novasRef = useRef(novas);
  useEffect(() => {
    novasRef.current = novas;
  }, [novas]);
  useEffect(() => () => novasRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl)), []);

  // ── Ações ──
  function marcar<T>(set: (v: T) => void) {
    return (valor: T) => {
      setTocou(true);
      set(valor);
    };
  }

  function responder(key: string, resultado: ResultadoChecklist | undefined) {
    setTocou(true);
    setRespostas((r) => ({ ...r, [key]: { observacao: r[key]?.observacao ?? "", resultado } }));
    setErros((e) => ({ ...e, checklist: undefined }));
  }
  function observar(key: string, observacao: string) {
    setTocou(true);
    setRespostas((r) => ({ ...r, [key]: { resultado: r[key]?.resultado, observacao } }));
  }
  function marcarTodosOk() {
    setTocou(true);
    setRespostas((r) => Object.fromEntries(itens.map((i) => [i.key, { resultado: "ok" as const, observacao: r[i.key]?.observacao ?? "" }])));
    setErros((e) => ({ ...e, checklist: undefined }));
  }

  function adicionarFotos(momento: FotoLocal["momento"], arquivos: File[]) {
    setTocou(true);
    const lote: FotoLocal[] = arquivos.map((a) => ({
      id: crypto.randomUUID(),
      momento,
      arquivo: null,
      previewUrl: URL.createObjectURL(a),
      estado: "comprimindo",
    }));
    setNovas((atual) => [...atual, ...lote]);
    setErros((e) => ({ ...e, fotos: undefined }));
    lote.forEach((foto, i) => {
      comprimirFoto(arquivos[i]).then(
        (blob) => setNovas((atual) => atual.map((f) => (f.id === foto.id ? { ...f, arquivo: blob, estado: "pronta" } : f))),
        (e: unknown) =>
          setNovas((atual) =>
            atual.map((f) =>
              f.id === foto.id
                ? { ...f, estado: "erro", mensagemErro: e instanceof Error ? e.message : "Não foi possível usar esta foto." }
                : f,
            ),
          ),
      );
    });
  }
  function removerNova(id: string) {
    setTocou(true);
    setNovas((atual) => {
      const alvo = atual.find((f) => f.id === id);
      if (alvo) URL.revokeObjectURL(alvo.previewUrl);
      return atual.filter((f) => f.id !== id);
    });
    setErros((e) => ({ ...e, fotos: undefined }));
  }
  function alternarExistente(id: string) {
    setTocou(true);
    setExistentes((atual) => atual.map((f) => (f.id === id ? { ...f, removida: !f.removida } : f)));
  }

  /** Valida uma etapa; devolve os erros encontrados (vazio = ok). */
  function validar(id: IdEtapa): Erros {
    const e: Erros = {};
    if (id === "tipo") {
      if (!tipo) e.tipo = "Escolha o tipo de serviço";
      if (!data) e.data = "Escolha a data do serviço";
    }
    if (id === "checklist") {
      const faltam = itens.filter((i) => !respostas[i.key]?.resultado).length;
      if (faltam > 0) {
        e.checklist = `Falta marcar ${faltam} ${faltam === 1 ? "item" : "itens"}: toque em OK, Não OK ou N/A.`;
      }
    }
    if (id === "fotos") {
      if (novas.some((f) => f.estado === "comprimindo")) e.fotos = "Espere as fotos ficarem prontas.";
      else if (novas.some((f) => f.estado === "erro")) e.fotos = "Remova as fotos com problema ou tire outras.";
    }
    if (id === "descricao") {
      if (!descricao.trim()) e.descricao = "Escreva o que foi feito";
      if (diasAteProxima <= 0) e.proxima = "A próxima manutenção precisa ser depois da data do serviço.";
    }
    return e;
  }

  function irPara(i: number) {
    setIndice(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continuar() {
    const e = validar(etapa);
    setErros(e);
    if (Object.keys(e).length > 0) return;
    irPara(Math.min(indice + 1, etapas.length - 1));
  }

  function voltar() {
    setErros({});
    if (indice === 0) return sair(voltarParaEquipamento);
    irPara(indice - 1);
  }

  function sair(href: string) {
    if (protegido) setSaidaPendente(href);
    else router.push(href);
  }

  async function salvar() {
    if (enviandoRef.current) return; // proteção contra duplo toque (o servidor também é idempotente)
    // Valida tudo antes de enviar; se algo faltar, leva a pessoa até a etapa com o problema.
    for (let i = 0; i < etapas.length - 1; i++) {
      const e = validar(etapas[i]);
      if (Object.keys(e).length > 0) {
        setErros(e);
        irPara(i);
        return;
      }
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErroEnvio(null);
    try {
      const checklist: RespostaChecklist[] = itens.map((i) => {
        const r = respostas[i.key];
        const observacao = r.resultado === "nao_ok" ? r.observacao.trim() : "";
        // O rótulo é copiado agora (snapshot): mudar o tipo depois não altera este histórico.
        return { key: i.key, label: i.label, resultado: r.resultado!, ...(observacao ? { observacao } : {}) };
      });
      const prontas = novas.filter((f) => f.arquivo).map((f) => ({ id: f.id, momento: f.momento, arquivo: f.arquivo! }));
      const dadosComuns = {
        tipo: tipo as TipoServicoValor,
        data,
        descricao: descricao.trim(),
        checklist,
        proximaData: proxima,
      };

      if (servico) {
        await repositorio.editarServico(
          servico.id,
          dadosComuns,
          prontas,
          existentes.filter((f) => f.removida).map((f) => f.id),
          setProgresso,
        );
      } else {
        await repositorio.salvarServico({ id: servicoId, equipamentoId: equipamento.id, ...dadosComuns }, prontas, setProgresso);
      }
      setSalvo(true);
      if (editando) toast.success("Serviço atualizado");
      else if (navigator.onLine) toast.success("Serviço salvo. Enviando…");
      // Sem internet o serviço fica guardado no celular e sobe sozinho quando a conexão voltar.
      else toast.success("Sem internet — seu registro está salvo no celular");
      router.push(voltarParaEquipamento);
      // Continua "enviando" até a navegação terminar: bloqueia novos toques.
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Não foi possível salvar o serviço.";
      setErroEnvio(mensagem);
      toast.error("Serviço não salvo. Seus dados continuam aqui: toque em Salvar para tentar de novo.");
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const resumo = resumirChecklist(itens.map((i) => ({ resultado: respostas[i.key]?.resultado ?? "ok" })));
  const fotosAntes = novas.filter((f) => f.momento === "antes").length + existentes.filter((f) => f.momento === "antes" && !f.removida).length;
  const fotosDepois = novas.filter((f) => f.momento === "depois").length + existentes.filter((f) => f.momento === "depois" && !f.removida).length;
  const respondidos = itens.filter((i) => respostas[i.key]?.resultado).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-24 md:pb-0">
      {/* Progresso */}
      <div className="flex flex-col gap-2" aria-live="polite">
        <p className="text-lg font-bold">
          {etapa === "revisao" ? "Revisão final" : `Passo ${indice + 1} de ${totalPassos}: ${TITULOS[etapa]}`}
        </p>
        <Progress
          value={etapa === "revisao" ? 100 : ((indice + 1) / totalPassos) * 100}
          aria-label={etapa === "revisao" ? "Revisão final" : `Passo ${indice + 1} de ${totalPassos}`}
        />
      </div>

      {/* Qual equipamento */}
      <p className="rounded-lg bg-muted px-3 py-2">
        <span className="text-muted-foreground">Equipamento: </span>
        <span className="font-semibold">{equipamento.nome}</span>
        <span className="text-muted-foreground"> · {equipamento.localNome}</span>
      </p>

      {/* ───── Passo: tipo e data ───── */}
      {etapa === "tipo" && (
        <Card>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!erros.tipo}>
                <FieldLabel id="serv-tipo-rotulo">Que serviço foi feito?</FieldLabel>
                <RadioGroup
                  aria-labelledby="serv-tipo-rotulo"
                  value={tipo}
                  onValueChange={(v) => {
                    setTocou(true);
                    setTipo(v as TipoServicoValor);
                    setErros((e) => ({ ...e, tipo: undefined }));
                  }}
                  className="grid grid-cols-2 gap-3"
                >
                  {TIPOS_SERVICO.map((t) => {
                    const Icone = ICONES_TIPO_SERVICO[t];
                    return (
                      <label
                        key={t}
                        htmlFor={`serv-tipo-${t}`}
                        className="relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-input p-3 text-center has-focus-visible:ring-4 has-focus-visible:ring-ring/60 has-data-checked:border-primary has-data-checked:bg-accent has-data-checked:text-primary"
                      >
                        <RadioGroupItem id={`serv-tipo-${t}`} value={t} className="sr-only" />
                        <Icone className="size-9" aria-hidden />
                        <span className="text-lg leading-tight font-semibold">{ROTULOS_TIPO_SERVICO[t]}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
                <FieldError errors={erros.tipo ? [{ message: erros.tipo }] : undefined} />
              </Field>

              <Field data-invalid={!!erros.data}>
                <FieldLabel htmlFor="serv-data">Data do serviço</FieldLabel>
                <SeletorData
                  id="serv-data"
                  valor={data}
                  onChange={(v) => {
                    setTocou(true);
                    setData(v);
                  }}
                  titulo="Data do serviço"
                  destaque={data === hojeIso() ? "hoje" : undefined}
                />
                <FieldError errors={erros.data ? [{ message: erros.data }] : undefined} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ───── Passo: checklist ───── */}
      {etapa === "checklist" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Button type="button" size="lg" variant="secondary" className="w-full" onClick={marcarTodosOk}>
              <CheckCheck aria-hidden />
              Marcar todos como OK
            </Button>
            <p className="text-muted-foreground" aria-live="polite">
              {respondidos} de {itens.length} itens marcados
            </p>
          </div>
          {erros.checklist && (
            <Alert variant="destructive" role="alert">
              <TriangleAlert aria-hidden />
              <AlertDescription>{erros.checklist}</AlertDescription>
            </Alert>
          )}
          {itens.map((item) => {
            const r = respostas[item.key];
            const semResposta = !!erros.checklist && !r?.resultado;
            return (
              <div
                key={item.key}
                className={cn("flex flex-col gap-3 rounded-xl border-2 p-3", semResposta && "border-destructive")}
              >
                <p id={`item-${item.key}`} className="text-lg leading-tight font-semibold">
                  {item.label}
                </p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  aria-labelledby={`item-${item.key}`}
                  value={r?.resultado ?? ""}
                  onValueChange={(v) => responder(item.key, (v || undefined) as ResultadoChecklist | undefined)}
                  className="grid w-full grid-cols-3"
                >
                  <ToggleGroupItem
                    value="ok"
                    className="h-14 text-base font-bold data-[state=on]:border-em-dia-border data-[state=on]:bg-em-dia data-[state=on]:text-em-dia-foreground"
                  >
                    OK
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="nao_ok"
                    className="h-14 text-base font-bold data-[state=on]:border-vencido-border data-[state=on]:bg-vencido data-[state=on]:text-vencido-foreground"
                  >
                    Não OK
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="na"
                    className="h-14 text-base font-bold data-[state=on]:border-sem-registro-border data-[state=on]:bg-sem-registro data-[state=on]:text-sem-registro-foreground"
                  >
                    N/A
                  </ToggleGroupItem>
                </ToggleGroup>
                {r?.resultado === "nao_ok" && (
                  <Field>
                    <FieldLabel htmlFor={`obs-${item.key}`}>O que foi encontrado? (opcional)</FieldLabel>
                    <Textarea
                      id={`obs-${item.key}`}
                      rows={2}
                      placeholder="Ex.: Filtro rasgado, será trocado"
                      value={r.observacao}
                      onChange={(e) => observar(item.key, e.target.value)}
                    />
                  </Field>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ───── Passo: fotos ───── */}
      {etapa === "fotos" && (
        <div className="flex flex-col gap-4">
          {erros.fotos && (
            <Alert variant="destructive" role="alert">
              <TriangleAlert aria-hidden />
              <AlertDescription>{erros.fotos}</AlertDescription>
            </Alert>
          )}
          <SecaoFotos
            momento="antes"
            titulo="Antes"
            descricao="Como o equipamento estava quando você chegou."
            novas={novas.filter((f) => f.momento === "antes")}
            existentes={existentes.filter((f) => f.momento === "antes")}
            aoAdicionar={adicionarFotos}
            aoRemoverNova={removerNova}
            aoAlternarExistente={alternarExistente}
          />
          <SecaoFotos
            momento="depois"
            titulo="Depois"
            descricao="Como ficou depois do serviço."
            novas={novas.filter((f) => f.momento === "depois")}
            existentes={existentes.filter((f) => f.momento === "depois")}
            aoAdicionar={adicionarFotos}
            aoRemoverNova={removerNova}
            aoAlternarExistente={alternarExistente}
          />
        </div>
      )}

      {/* ───── Passo: descrição e próxima data ───── */}
      {etapa === "descricao" && (
        <Card>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!erros.descricao}>
                <FieldLabel htmlFor="serv-descricao">O que foi feito</FieldLabel>
                <Textarea
                  id="serv-descricao"
                  rows={5}
                  placeholder="Ex.: Limpeza dos filtros e da evaporadora. Troca da correia. Aparelho testado e funcionando normalmente."
                  aria-invalid={!!erros.descricao}
                  value={descricao}
                  onChange={(e) => {
                    setTocou(true);
                    setDescricao(e.target.value);
                    setErros((x) => ({ ...x, descricao: undefined }));
                  }}
                />
                <FieldError errors={erros.descricao ? [{ message: erros.descricao }] : undefined} />
              </Field>

              <Field data-invalid={!!erros.proxima}>
                <FieldLabel htmlFor="serv-proxima">Próxima manutenção</FieldLabel>
                <p className="text-lg font-semibold" aria-live="polite">
                  Próxima manutenção em {formatarDias(Math.max(diasAteProxima, 0))} ({formatarData(proxima)})
                </p>
                <FieldDescription>
                  {proximaManual
                    ? "Você escolheu esta data."
                    : `Calculada pelo prazo do equipamento: a cada ${formatarDias(equipamento.periodicidadeDias)}.`}
                </FieldDescription>
                <SeletorData
                  id="serv-proxima"
                  valor={proxima}
                  onChange={(v) => {
                    setTocou(true);
                    setProximaManual(v === proximaPadrao ? null : v);
                    setErros((x) => ({ ...x, proxima: undefined }));
                  }}
                  titulo="Data da próxima manutenção"
                />
                {proximaManual && (
                  <Button type="button" variant="outline" onClick={() => marcar(setProximaManual)(null)}>
                    Voltar ao prazo padrão ({formatarDias(equipamento.periodicidadeDias)})
                  </Button>
                )}
                <FieldError errors={erros.proxima ? [{ message: erros.proxima }] : undefined} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ───── Revisão final ───── */}
      {etapa === "revisao" && (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">Confira tudo. Se algo estiver errado, toque em &quot;Alterar&quot;.</p>

          <ResumoCard titulo="Serviço" aoAlterar={() => irPara(etapas.indexOf("tipo"))}>
            <p className="text-lg font-semibold">{tipo ? ROTULOS_TIPO_SERVICO[tipo] : "—"}</p>
            <p>Data: {formatarData(data)}</p>
          </ResumoCard>

          {itens.length > 0 && (
            <ResumoCard titulo="Checklist" aoAlterar={() => irPara(etapas.indexOf("checklist"))}>
              <p className={cn("text-lg font-semibold", resumo.temProblema && "text-vencido-foreground")}>{resumo.texto}</p>
              {itens
                .filter((i) => respostas[i.key]?.resultado === "nao_ok")
                .map((i) => (
                  <p key={i.key} className="text-vencido-foreground">
                    Não OK: {i.label}
                    {respostas[i.key].observacao.trim() && ` — ${respostas[i.key].observacao.trim()}`}
                  </p>
                ))}
            </ResumoCard>
          )}

          <ResumoCard titulo="Fotos" aoAlterar={() => irPara(etapas.indexOf("fotos"))}>
            <p>
              Antes: {fotosAntes} {fotosAntes === 1 ? "foto" : "fotos"} · Depois: {fotosDepois} {fotosDepois === 1 ? "foto" : "fotos"}
            </p>
            {novas.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {novas.map((f) => (
                  <li key={f.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob) */}
                    <img src={f.previewUrl} alt={`Foto de ${f.momento === "antes" ? "antes" : "depois"}`} className="size-16 rounded-md border object-cover" />
                  </li>
                ))}
              </ul>
            )}
          </ResumoCard>

          <ResumoCard titulo="Descrição e próxima data" aoAlterar={() => irPara(etapas.indexOf("descricao"))}>
            <p className="whitespace-pre-line">{descricao.trim() || "—"}</p>
            <p className="font-semibold">
              Próxima manutenção em {formatarDias(Math.max(diasAteProxima, 0))} ({formatarData(proxima)})
            </p>
          </ResumoCard>

          {enviando && progresso && (
            <div className="flex flex-col gap-2 rounded-xl border-2 border-primary p-3" role="status" aria-live="polite">
              <p className="font-semibold">
                {progresso.etapa === "fotos" && progresso.totalFotos > 0
                  ? `Enviando foto ${Math.min(progresso.fotosEnviadas + 1, progresso.totalFotos)} de ${progresso.totalFotos}...`
                  : "Salvando o serviço..."}
              </p>
              <Progress value={progresso.percentual} aria-label="Andamento do envio" />
            </div>
          )}

          {erroEnvio && (
            <Alert variant="destructive" role="alert">
              <TriangleAlert aria-hidden />
              <AlertTitle>Serviço não salvo</AlertTitle>
              <AlertDescription>{erroEnvio} Seus dados continuam aqui: toque em &quot;Salvar serviço&quot; para tentar de novo.</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* ───── Botões fixos embaixo (celular) ───── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-background pb-[env(safe-area-inset-bottom)] md:static md:z-auto md:border-0 md:bg-transparent md:pb-0">
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 p-3 md:p-0">
          <Button type="button" size="lg" variant="outline" onClick={voltar} disabled={enviando}>
            <ArrowLeft aria-hidden />
            Voltar
          </Button>
          {ultima ? (
            <Button type="button" size="lg" onClick={salvar} disabled={enviando}>
              {enviando ? <Spinner /> : <Save aria-hidden />}
              {enviando ? "Salvando..." : "Salvar serviço"}
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={continuar}>
              Continuar
              <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {/* Sair com dados preenchidos */}
      {saidaPendente && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setSaidaPendente(null)}
          destrutivo
          titulo="Sair sem salvar o serviço?"
          descricao="Tudo o que você preencheu neste serviço (checklist, fotos e descrição) será perdido."
          rotuloConfirmar="Sair sem salvar"
          rotuloCancelar="Continuar preenchendo"
          onConfirmar={() => {
            setSalvo(true); // desliga a proteção
            router.push(saidaPendente);
          }}
        />
      )}
    </div>
  );
}

function padraoDaProxima(data: string, periodicidadeDias: number): string {
  return format(addDays(parseISO(data), periodicidadeDias), "yyyy-MM-dd");
}

function ResumoCard({
  titulo,
  aoAlterar,
  children,
}: {
  titulo: string;
  aoAlterar: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">{titulo}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={aoAlterar}>
          <Pencil aria-hidden />
          Alterar
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">{children}</CardContent>
    </Card>
  );
}
