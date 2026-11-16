"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { IconeTipo } from "@/components/icone-tipo";
import { PreviaFormulario } from "@/components/previa-formulario";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { gerarKey } from "@/lib/chaves";
import { TIPOS_CAMPO, type CampoDefinicao, type TipoCampo } from "@/lib/schemas/campo";
import { PERIODICIDADES_RAPIDAS, periodicidadeSchema, type TipoInput } from "@/lib/schemas/entidades";
import { ICONES_TIPO, NOMES_ICONES } from "@/lib/schemas/icones";
import { repositorio, useTipo, type TipoEquipamentoDetalhe } from "@/lib/tecnico/data";

const ROTULOS_TIPO_CAMPO: Record<TipoCampo, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  selecao: "Seleção (lista de opções)",
  sim_nao: "Sim ou não",
};

// ───────────────────────── Formulário ─────────────────────────

const campoFormSchema = z
  .object({
    /** Vazia enquanto o campo é novo; a key é gerada ao salvar e nunca mais muda. */
    key: z.string(),
    label: z.string().trim().min(1, "Escreva o nome do campo"),
    type: z.enum(TIPOS_CAMPO),
    obrigatorio: z.boolean(),
    unidade: z.string().optional(),
    opcoesTexto: z.string().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.type === "selecao" && opcoesDe(c.opcoesTexto).length === 0) {
      ctx.addIssue({ code: "custom", path: ["opcoesTexto"], message: "Escreva pelo menos uma opção (uma por linha)" });
    }
  });

const formSchema = z.object({
  nome: z.string().trim().min(1, "Escreva o nome do tipo, por exemplo Extintor"),
  icone: z.enum(NOMES_ICONES, { error: "Escolha um ícone" }),
  periodicidadePadraoDias: periodicidadeSchema,
  campos: z.array(campoFormSchema),
  checklist: z.array(z.object({ key: z.string(), label: z.string().trim().min(1, "Escreva o texto do item") })),
});
type ValoresForm = z.infer<typeof formSchema>;
type CampoForm = ValoresForm["campos"][number];

function opcoesDe(texto: string | undefined): string[] {
  return (texto ?? "")
    .split(/\n|;/)
    .map((o) => o.trim())
    .filter(Boolean);
}

function paraDefinicao(c: CampoForm, key: string): CampoDefinicao {
  return {
    key,
    label: c.label.trim(),
    type: c.type,
    obrigatorio: c.obrigatorio,
    ...(c.type === "selecao" ? { options: opcoesDe(c.opcoesTexto) } : {}),
    ...(c.type === "numero" && c.unidade?.trim() ? { unidade: c.unidade.trim() } : {}),
  };
}

function valoresIniciais(tipo?: TipoEquipamentoDetalhe): ValoresForm {
  if (!tipo) {
    return { nome: "", icone: "Wrench", periodicidadePadraoDias: 90, campos: [], checklist: [] };
  }
  return {
    nome: tipo.nome,
    icone: (NOMES_ICONES as readonly string[]).includes(tipo.icone ?? "") ? (tipo.icone as ValoresForm["icone"]) : "Wrench",
    periodicidadePadraoDias: tipo.periodicidadePadraoDias,
    campos: tipo.campos.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
      obrigatorio: c.obrigatorio,
      unidade: c.unidade ?? "",
      opcoesTexto: (c.options ?? []).join("\n"),
    })),
    checklist: tipo.checklist.map((i) => ({ key: i.key, label: i.label })),
  };
}

// ───────────────────────── Tela ─────────────────────────

export function EditorTipo({ id }: { id?: string }) {
  if (!id) return <FormularioTipo />;
  return <EditorTipoExistente id={id} />;
}

function EditorTipoExistente({ id }: { id: string }) {
  const { dados: tipo, erro, recarregar } = useTipo(id);
  if (tipo === undefined) {
    if (erro) return <ErroAoCarregar mensagem={erro} aoTentar={recarregar} />;
    return <CarregandoLista linhas={3} />;
  }
  if (tipo === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Tipo não encontrado</AlertTitle>
        <AlertDescription>Este tipo não existe mais. Volte para a lista de tipos.</AlertDescription>
      </Alert>
    );
  }
  return <FormularioTipo tipo={tipo} />;
}

type Remocao = { alvo: "campo" | "item"; indice: number };

function FormularioTipo({ tipo }: { tipo?: TipoEquipamentoDetalhe }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [remocao, setRemocao] = useState<Remocao | null>(null);
  const [confirmando, setConfirmando] = useState<"arquivar" | "reativar" | "excluir" | null>(null);

  const form = useForm<ValoresForm>({
    resolver: zodResolver(formSchema),
    defaultValues: valoresIniciais(tipo),
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;
  const campos = useFieldArray({ control, name: "campos" });
  const itens = useFieldArray({ control, name: "checklist" });
  const camposAtuais = useWatch({ control, name: "campos" });
  const periodicidade = useWatch({ control, name: "periodicidadePadraoDias" });
  const iconeAtual = useWatch({ control, name: "icone" });

  const definicoesPrevia = useMemo<CampoDefinicao[]>(
    () =>
      (camposAtuais ?? []).map((c, i) =>
        paraDefinicao({ ...c, label: c.label?.trim() ? c.label : "Campo sem nome" }, c.key || `novo_${campos.fields[i]?.id ?? i}`),
      ),
    [camposAtuais, campos.fields],
  );

  async function salvar(valores: ValoresForm) {
    setEnviando(true);
    try {
      // Campos novos ganham a key agora; as existentes nunca mudam.
      const usadas = new Set(valores.campos.map((c) => c.key).filter(Boolean));
      const definicoes = valores.campos.map((c) => {
        const key = c.key || gerarKey(c.label, usadas);
        usadas.add(key);
        return paraDefinicao(c, key);
      });
      const usadasItens = new Set(valores.checklist.map((i) => i.key).filter(Boolean));
      const checklist = valores.checklist.map((i) => {
        const key = i.key || gerarKey(i.label, usadasItens);
        usadasItens.add(key);
        return { key, label: i.label.trim() };
      });

      const dados: TipoInput = {
        id: tipo?.id ?? crypto.randomUUID(),
        nome: valores.nome,
        icone: valores.icone,
        periodicidadePadraoDias: valores.periodicidadePadraoDias,
        campos: definicoes,
        checklist,
      };
      await repositorio.salvarTipo(dados);
      toast.success("Tipo salvo");
      router.push("/tecnico/tipos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar. Tente de novo.");
      setEnviando(false);
    }
  }

  function mover(lista: { move: (de: number, para: number) => void }, de: number, para: number) {
    lista.move(de, para);
  }

  const campoRemovendo = remocao?.alvo === "campo" ? camposAtuais?.[remocao.indice] : undefined;
  const usoDoCampoRemovido = campoRemovendo?.key ? (tipo?.usoCampos[campoRemovendo.key] ?? 0) : 0;
  const itemRemovendo = remocao?.alvo === "item" ? form.getValues(`checklist.${remocao.indice}`) : undefined;

  return (
    <form onSubmit={handleSubmit(salvar)} noValidate>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-4">
          {/* ───── 1. Dados do tipo ───── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Dados do tipo</CardTitle>
              <CardDescription>Nome, ícone e de quanto em quanto tempo a manutenção deve ser feita.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!errors.nome}>
                  <FieldLabel htmlFor="tipo-nome">Nome do tipo</FieldLabel>
                  <Input id="tipo-nome" placeholder="Ex.: Extintor" aria-invalid={!!errors.nome} {...register("nome")} />
                  <FieldError errors={[errors.nome]} />
                </Field>

                <Field data-invalid={!!errors.icone}>
                  <FieldLabel id="tipo-icone-rotulo">Ícone</FieldLabel>
                  <RadioGroup
                    aria-labelledby="tipo-icone-rotulo"
                    value={iconeAtual}
                    onValueChange={(v) => setValue("icone", v as ValoresForm["icone"], { shouldDirty: true })}
                    className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                  >
                    {ICONES_TIPO.map(({ nome, rotulo }) => (
                      <label
                        key={nome}
                        htmlFor={`icone-${nome}`}
                        className="relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-input p-2 text-center text-sm font-medium has-focus-visible:ring-4 has-focus-visible:ring-ring/60 has-data-checked:border-primary has-data-checked:bg-accent has-data-checked:text-primary"
                      >
                        <RadioGroupItem id={`icone-${nome}`} value={nome} className="sr-only" />
                        <IconeTipo nome={nome} className="size-7" />
                        {rotulo}
                      </label>
                    ))}
                  </RadioGroup>
                  <FieldError errors={[errors.icone]} />
                </Field>

                <Field data-invalid={!!errors.periodicidadePadraoDias}>
                  <FieldLabel htmlFor="tipo-periodicidade">Periodicidade padrão (em dias)</FieldLabel>
                  <Input
                    id="tipo-periodicidade"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-invalid={!!errors.periodicidadePadraoDias}
                    {...register("periodicidadePadraoDias", { valueAsNumber: true })}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PERIODICIDADES_RAPIDAS.map(({ rotulo, dias }) => (
                      <Button
                        key={dias}
                        type="button"
                        variant={periodicidade === dias ? "default" : "outline"}
                        aria-pressed={periodicidade === dias}
                        onClick={() => setValue("periodicidadePadraoDias", dias, { shouldDirty: true, shouldValidate: true })}
                      >
                        {rotulo} ({dias})
                      </Button>
                    ))}
                  </div>
                  <FieldDescription>Cada equipamento novo começa com este prazo, mas pode ser mudado depois.</FieldDescription>
                  <FieldError errors={[errors.periodicidadePadraoDias]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* ───── 2. Campos do cadastro ───── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Campos do cadastro</CardTitle>
              <CardDescription>
                O que você preenche ao cadastrar um equipamento deste tipo (marca, modelo, capacidade…).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {campos.fields.length === 0 && (
                <p className="text-muted-foreground">Nenhum campo ainda. Todo equipamento já tem nome, local e observações.</p>
              )}
              {campos.fields.map((campoLinha, i) => {
                const atual = camposAtuais?.[i];
                const tipoCampo = atual?.type ?? "texto";
                const emUso = !!atual?.key && (tipo?.usoCampos[atual.key] ?? 0) > 0;
                const errosCampo = errors.campos?.[i];
                return (
                  <div key={campoLinha.id} className="flex flex-col gap-4 rounded-xl border-2 p-4">
                    <p className="font-semibold">Campo {i + 1}</p>
                    <FieldGroup>
                      <Field data-invalid={!!errosCampo?.label}>
                        <FieldLabel htmlFor={`campo-${i}-label`}>Nome do campo</FieldLabel>
                        <Input
                          id={`campo-${i}-label`}
                          placeholder="Ex.: Marca"
                          aria-invalid={!!errosCampo?.label}
                          {...register(`campos.${i}.label`)}
                        />
                        <FieldError errors={[errosCampo?.label]} />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor={`campo-${i}-tipo`}>Tipo de resposta</FieldLabel>
                        <NativeSelect id={`campo-${i}-tipo`} className="w-full" disabled={emUso} {...register(`campos.${i}.type`)}>
                          {TIPOS_CAMPO.map((t) => (
                            <NativeSelectOption key={t} value={t}>
                              {ROTULOS_TIPO_CAMPO[t]}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        {emUso && (
                          <FieldDescription>O tipo de resposta não pode mudar porque já há equipamentos com este campo preenchido.</FieldDescription>
                        )}
                      </Field>

                      {tipoCampo === "numero" && (
                        <Field>
                          <FieldLabel htmlFor={`campo-${i}-unidade`}>Unidade (opcional)</FieldLabel>
                          <Input id={`campo-${i}-unidade`} placeholder="Ex.: BTUs, litros, horas" {...register(`campos.${i}.unidade`)} />
                        </Field>
                      )}

                      {tipoCampo === "selecao" && (
                        <Field data-invalid={!!errosCampo?.opcoesTexto}>
                          <FieldLabel htmlFor={`campo-${i}-opcoes`}>Opções (uma por linha)</FieldLabel>
                          <Textarea
                            id={`campo-${i}-opcoes`}
                            rows={4}
                            placeholder={"Split\nJanela\nCassete"}
                            aria-invalid={!!errosCampo?.opcoesTexto}
                            {...register(`campos.${i}.opcoesTexto`)}
                          />
                          <FieldError errors={[errosCampo?.opcoesTexto]} />
                        </Field>
                      )}

                      <Controller
                        control={control}
                        name={`campos.${i}.obrigatorio`}
                        render={({ field }) => (
                          <label
                            htmlFor={`campo-${i}-obrigatorio`}
                            className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border px-4"
                          >
                            <span className="font-medium">Preenchimento obrigatório</span>
                            <Switch id={`campo-${i}-obrigatorio`} checked={field.value} onCheckedChange={field.onChange} />
                          </label>
                        )}
                      />
                    </FieldGroup>

                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" disabled={i === 0} onClick={() => mover(campos, i, i - 1)}>
                        <ArrowUp aria-hidden />
                        Subir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={i === campos.fields.length - 1}
                        onClick={() => mover(campos, i, i + 1)}
                      >
                        <ArrowDown aria-hidden />
                        Descer
                      </Button>
                      <Button type="button" variant="outline" className="col-span-2" onClick={() => setRemocao({ alvo: "campo", indice: i })}>
                        <Trash2 aria-hidden />
                        Remover
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto sm:self-start"
                onClick={() =>
                  campos.append({ key: "", label: "", type: "texto", obrigatorio: false, unidade: "", opcoesTexto: "" })
                }
              >
                <Plus aria-hidden />
                Adicionar campo
              </Button>
            </CardContent>
          </Card>

          {/* ───── 3. Checklist do serviço ───── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Checklist do serviço</CardTitle>
              <CardDescription>
                Itens que você marca (OK, Não OK ou N/A) a cada serviço. Mudar o texto aqui não altera serviços já registrados.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {itens.fields.length === 0 && <p className="text-muted-foreground">Nenhum item ainda.</p>}
              {itens.fields.map((itemLinha, i) => {
                const erroItem = errors.checklist?.[i]?.label;
                return (
                  <div key={itemLinha.id} className="flex flex-col gap-3 rounded-xl border-2 p-4">
                    <Field data-invalid={!!erroItem}>
                      <FieldLabel htmlFor={`item-${i}`}>Item {i + 1}</FieldLabel>
                      <Input
                        id={`item-${i}`}
                        placeholder="Ex.: Filtros limpos"
                        aria-invalid={!!erroItem}
                        {...register(`checklist.${i}.label`)}
                      />
                      <FieldError errors={[erroItem]} />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" disabled={i === 0} onClick={() => mover(itens, i, i - 1)}>
                        <ArrowUp aria-hidden />
                        Subir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={i === itens.fields.length - 1}
                        onClick={() => mover(itens, i, i + 1)}
                      >
                        <ArrowDown aria-hidden />
                        Descer
                      </Button>
                      <Button type="button" variant="outline" className="col-span-2" onClick={() => setRemocao({ alvo: "item", indice: i })}>
                        <Trash2 aria-hidden />
                        Remover
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto sm:self-start"
                onClick={() => itens.append({ key: "", label: "" })}
              >
                <Plus aria-hidden />
                Adicionar item
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ───── Pré-visualização ───── */}
        <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-lg">Pré-visualização</CardTitle>
            <CardDescription>Assim fica o formulário ao cadastrar um equipamento deste tipo.</CardDescription>
          </CardHeader>
          <CardContent>
            <PreviaFormulario campos={definicoesPrevia} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={enviando}>
            {enviando ? <Spinner /> : <Save aria-hidden />}
            {enviando ? "Salvando..." : "Salvar tipo"}
          </Button>

          {tipo && (
            <div className="grid gap-2 sm:grid-cols-2">
              {tipo.ativo ? (
                <Button type="button" variant="outline" onClick={() => setConfirmando("arquivar")}>
                  <Archive aria-hidden />
                  Arquivar tipo
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => setConfirmando("reativar")}>
                  <ArchiveRestore aria-hidden />
                  Reativar tipo
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setConfirmando("excluir")}>
                <Trash2 aria-hidden />
                Excluir tipo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Remover campo / item */}
      {remocao && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setRemocao(null)}
          destrutivo
          titulo={remocao.alvo === "campo" ? "Remover este campo?" : "Remover este item do checklist?"}
          descricao={
            remocao.alvo === "campo"
              ? usoDoCampoRemovido > 0
                ? `O campo "${campoRemovendo?.label}" já tem valores em ${usoDoCampoRemovido} equipamento${usoDoCampoRemovido === 1 ? "" : "s"}. Os valores antigos ficam guardados, mas não aparecem mais no formulário.`
                : `O campo "${campoRemovendo?.label || "sem nome"}" deixa de aparecer no formulário do equipamento.`
              : `O item "${itemRemovendo?.label || "sem texto"}" deixa de aparecer nos próximos serviços. Os serviços já registrados mantêm o texto original.`
          }
          rotuloConfirmar={remocao.alvo === "campo" ? "Remover campo" : "Remover item"}
          onConfirmar={() => {
            if (remocao.alvo === "campo") campos.remove(remocao.indice);
            else itens.remove(remocao.indice);
          }}
        />
      )}

      {/* Arquivar / reativar / excluir tipo */}
      {tipo && confirmando === "arquivar" && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setConfirmando(null)}
          titulo="Arquivar este tipo?"
          descricao={`Os ${tipo.quantidadeEquipamentos} equipamento(s) deste tipo continuam funcionando normalmente, mas você não poderá escolher "${tipo.nome}" ao cadastrar equipamentos novos. Dá para reativar depois.`}
          rotuloConfirmar="Arquivar tipo"
          onConfirmar={async () => {
            try {
              await repositorio.definirTipoAtivo(tipo.id, false);
              toast.success("Tipo arquivado");
              router.push("/tecnico/tipos");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Não foi possível arquivar.");
              throw e;
            }
          }}
        />
      )}
      {tipo && confirmando === "reativar" && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setConfirmando(null)}
          titulo="Reativar este tipo?"
          descricao={`"${tipo.nome}" volta a aparecer ao cadastrar equipamentos novos.`}
          rotuloConfirmar="Reativar tipo"
          onConfirmar={async () => {
            try {
              await repositorio.definirTipoAtivo(tipo.id, true);
              toast.success("Tipo reativado");
              router.push("/tecnico/tipos");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Não foi possível reativar.");
              throw e;
            }
          }}
        />
      )}
      {tipo && confirmando === "excluir" && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setConfirmando(null)}
          destrutivo
          titulo={tipo.quantidadeEquipamentos > 0 ? "Este tipo não pode ser excluído" : "Excluir este tipo?"}
          descricao={
            tipo.quantidadeEquipamentos > 0
              ? `Há ${tipo.quantidadeEquipamentos} equipamento${tipo.quantidadeEquipamentos === 1 ? "" : "s"} deste tipo, então ele não pode ser excluído. Use "Arquivar tipo" para tirá-lo da lista de escolha.`
              : `O tipo "${tipo.nome}" será removido. Esta ação não pode ser desfeita.`
          }
          rotuloConfirmar="Excluir tipo"
          onConfirmar={
            tipo.quantidadeEquipamentos > 0
              ? undefined
              : async () => {
                  try {
                    await repositorio.excluirTipo(tipo.id);
                    toast.success("Tipo excluído");
                    router.push("/tecnico/tipos");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
                    throw e;
                  }
                }
          }
        />
      )}
    </form>
  );
}
