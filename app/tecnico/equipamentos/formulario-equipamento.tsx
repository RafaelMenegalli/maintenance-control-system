"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CamposDinamicos } from "@/components/campos-dinamicos";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { IconeTipo } from "@/components/icone-tipo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { atributosParaFormulario, criarSchemaFormulario, formularioParaAtributos } from "@/lib/schemas/atributos";
import type { CampoDefinicao } from "@/lib/schemas/campo";
import { periodicidadeSchema } from "@/lib/schemas/entidades";
import {
  repositorio,
  useClienteAutomatico,
  useEquipamento,
  useLocais,
  useTipos,
  type EquipamentoDetalhe,
  type LocalDTO,
  type TipoEquipamentoDTO,
} from "@/lib/tecnico/data";
import { cn } from "@/lib/utils";

const schemaBase = z.object({
  tipoId: z.string().min(1, "Escolha o tipo do equipamento"),
  localId: z.string().min(1, "Escolha o local do equipamento"),
  nome: z.string().trim().min(1, "Informe o nome ou a identificação do equipamento"),
  periodicidadeDias: periodicidadeSchema,
  observacoes: z.string().optional(),
  atributos: z.record(z.string(), z.string().optional()),
});
type Valores = z.infer<typeof schemaBase>;

const ETAPAS: { titulo: string; descricao: string; campos: (keyof Valores)[] }[] = [
  { titulo: "Tipo e local", descricao: "O que é o equipamento e onde ele está.", campos: ["tipoId", "localId"] },
  { titulo: "Dados do equipamento", descricao: "Nome e informações do cadastro.", campos: ["nome", "atributos"] },
  { titulo: "Manutenção", descricao: "De quanto em quanto tempo e observações.", campos: ["periodicidadeDias", "observacoes"] },
];

// ───────────────────────── Carregamento ─────────────────────────

export function FormularioEquipamento({ id }: { id?: string }) {
  const tipos = useTipos();
  const locais = useLocais();
  const { precisaEscolher } = useClienteAutomatico();
  const equipamento = useEquipamento(id ?? null);

  const carregandoEquip = !!id && equipamento.dados === undefined && !equipamento.erro;
  const erro = tipos.erro ?? locais.erro ?? (id ? equipamento.erro : null);

  if (erro && (!tipos.dados || !locais.dados)) {
    return <ErroAoCarregar mensagem={erro} aoTentar={() => (tipos.recarregar(), locais.recarregar(), equipamento.recarregar())} />;
  }
  if (!tipos.dados || !locais.dados || carregandoEquip) return <CarregandoLista linhas={3} />;

  if (id && equipamento.dados === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Equipamento não encontrado</AlertTitle>
        <AlertDescription>Este equipamento não existe mais. Volte para a lista de equipamentos.</AlertDescription>
      </Alert>
    );
  }

  const tiposAtivos = tipos.dados.filter((t) => t.ativo);
  if (locais.dados.length === 0) {
    return (
      <Alert>
        <AlertTitle>Cadastre um local primeiro</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>Todo equipamento fica em um local (por exemplo, Bloco A). Cadastre o cliente e o primeiro local.</span>
          <Button asChild>
            <Link href="/tecnico/clientes">Ir para clientes e locais</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (!id && tiposAtivos.length === 0) {
    return (
      <Alert>
        <AlertTitle>Não há tipos de equipamento disponíveis</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>Crie um tipo (por exemplo, Extintor) antes de cadastrar o equipamento.</span>
          <Button asChild>
            <Link href="/tecnico/tipos/novo">Criar tipo</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <FormularioInterno
      equipamento={equipamento.dados ?? undefined}
      tipos={id ? tipos.dados : tiposAtivos}
      locais={locais.dados}
      precisaEscolherCliente={precisaEscolher}
    />
  );
}

// ───────────────────────── Formulário ─────────────────────────

function FormularioInterno({
  equipamento,
  tipos,
  locais,
  precisaEscolherCliente,
}: {
  equipamento?: EquipamentoDetalhe;
  tipos: TipoEquipamentoDTO[];
  locais: LocalDTO[];
  precisaEscolherCliente: boolean;
}) {
  const router = useRouter();
  const mobile = useIsMobile();
  const [etapa, setEtapa] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const editando = !!equipamento;
  const ultima = ETAPAS.length - 1;

  // Valores padrão inteligentes: se só existe um local, já vem escolhido.
  const form = useForm<Valores>({
    defaultValues: equipamento
      ? {
          tipoId: equipamento.tipoId,
          localId: equipamento.localId,
          nome: equipamento.nome,
          periodicidadeDias: equipamento.periodicidadeDias,
          observacoes: equipamento.observacoes ?? "",
          atributos: atributosParaFormulario(equipamento.campos, equipamento.atributos),
        }
      : {
          tipoId: tipos.length === 1 ? tipos[0].id : "",
          localId: locais.length === 1 ? locais[0].id : "",
          nome: "",
          periodicidadeDias: tipos.length === 1 ? tipos[0].periodicidadePadraoDias : NaN,
          observacoes: "",
          atributos: {},
        },
    // O schema depende dos campos do tipo escolhido; é montado a cada renderização (ver abaixo).
    resolver: ((valores, contexto, opcoes) =>
      (zodResolver(schemaPara(camposDoTipo(valores.tipoId))) as unknown as Resolver<Valores>)(valores, contexto, opcoes)) as Resolver<Valores>,
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, dirtyFields },
  } = form;

  const tipoId = useWatch({ control, name: "tipoId" });
  const tipo = tipos.find((t) => t.id === tipoId);
  const campos: CampoDefinicao[] = equipamento ? equipamento.campos : (tipo?.campos ?? []);

  function camposDoTipo(id: string): CampoDefinicao[] {
    if (equipamento) return equipamento.campos;
    return tipos.find((t) => t.id === id)?.campos ?? [];
  }
  function schemaPara(c: CampoDefinicao[]) {
    return schemaBase.extend({ atributos: criarSchemaFormulario(c) });
  }

  function escolherTipo(novoId: string) {
    const novo = tipos.find((t) => t.id === novoId);
    setValue("tipoId", novoId, { shouldValidate: true, shouldDirty: true });
    setValue("atributos", {});
    // Periodicidade vem do tipo, a não ser que a pessoa já tenha mexido nela.
    if (novo && !dirtyFields.periodicidadeDias) setValue("periodicidadeDias", novo.periodicidadePadraoDias);
  }

  async function proxima() {
    const ok = await trigger(ETAPAS[etapa].campos as never);
    if (ok) setEtapa((e) => Math.min(e + 1, ultima));
  }

  function primeiraEtapaComErro(erros: FieldErrors<Valores>) {
    const i = ETAPAS.findIndex((e) => e.campos.some((c) => erros[c]));
    if (i >= 0) setEtapa(i);
  }

  async function salvar(valores: Valores) {
    setEnviando(true);
    try {
      const { id } = await repositorio.salvarEquipamento({
        id: equipamento?.id ?? crypto.randomUUID(),
        localId: valores.localId,
        tipoId: valores.tipoId,
        nome: valores.nome,
        periodicidadeDias: valores.periodicidadeDias,
        atributos: formularioParaAtributos(campos, valores.atributos as Record<string, string>),
        observacoes: valores.observacoes,
      });
      toast.success(editando ? "Equipamento atualizado" : "Equipamento salvo");
      router.push(`/tecnico/equipamentos/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar. Tente de novo.");
      setEnviando(false);
    }
  }

  // No celular o formulário vira etapas; Enter nas etapas intermediárias só avança.
  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    if (mobile && etapa < ultima) {
      e.preventDefault();
      void proxima();
      return;
    }
    void handleSubmit(salvar, primeiraEtapaComErro)(e);
  }

  const visivel = (i: number) => cn(etapa === i ? "flex" : "hidden", "md:flex");
  const clientesDosLocais = useMemo(() => [...new Set(locais.map((l) => l.clienteNome))], [locais]);

  return (
    <form onSubmit={aoEnviar} noValidate className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Indicador de progresso (celular) */}
      <div className="flex flex-col gap-2 md:hidden" aria-live="polite">
        <p className="font-semibold">
          Passo {etapa + 1} de {ETAPAS.length}: {ETAPAS[etapa].titulo}
        </p>
        <Progress value={((etapa + 1) / ETAPAS.length) * 100} aria-label={`Passo ${etapa + 1} de ${ETAPAS.length}`} />
      </div>

      {/* ───── Passo 1: tipo e local ───── */}
      <Card className={visivel(0)}>
        <CardHeader>
          <CardTitle className="text-lg">{ETAPAS[0].titulo}</CardTitle>
          <CardDescription>{ETAPAS[0].descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.tipoId}>
              <FieldLabel id="eq-tipo-rotulo">Tipo de equipamento</FieldLabel>
              <RadioGroup
                aria-labelledby="eq-tipo-rotulo"
                value={tipoId}
                onValueChange={escolherTipo}
                disabled={editando}
                className="grid gap-2 sm:grid-cols-2"
              >
                {tipos.map((t) => (
                  <label
                    key={t.id}
                    htmlFor={`tipo-${t.id}`}
                    className="flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border border-input px-4 has-focus-visible:ring-4 has-focus-visible:ring-ring/60 has-data-checked:border-primary has-data-checked:bg-accent has-disabled:cursor-not-allowed has-disabled:opacity-60"
                  >
                    <RadioGroupItem id={`tipo-${t.id}`} value={t.id} />
                    <IconeTipo nome={t.icone} className="size-6 shrink-0 text-primary" />
                    <span className="text-base leading-tight font-medium">{t.nome}</span>
                  </label>
                ))}
              </RadioGroup>
              {editando && <FieldDescription>O tipo não pode ser mudado depois que o equipamento é cadastrado.</FieldDescription>}
              <FieldError errors={[errors.tipoId]} />
            </Field>

            <Field data-invalid={!!errors.localId}>
              <FieldLabel htmlFor="eq-local">Local</FieldLabel>
              <NativeSelect id="eq-local" className="w-full" aria-invalid={!!errors.localId} {...register("localId")}>
                <NativeSelectOption value="">Escolha o local</NativeSelectOption>
                {precisaEscolherCliente
                  ? clientesDosLocais.map((cliente) => (
                      <NativeSelectOptGroup key={cliente} label={cliente}>
                        {locais
                          .filter((l) => l.clienteNome === cliente)
                          .map((l) => (
                            <NativeSelectOption key={l.id} value={l.id}>
                              {l.nome}
                            </NativeSelectOption>
                          ))}
                      </NativeSelectOptGroup>
                    ))
                  : locais.map((l) => (
                      <NativeSelectOption key={l.id} value={l.id}>
                        {l.nome}
                      </NativeSelectOption>
                    ))}
              </NativeSelect>
              <FieldError errors={[errors.localId]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ───── Passo 2: nome e campos do tipo ───── */}
      <Card className={visivel(1)}>
        <CardHeader>
          <CardTitle className="text-lg">{ETAPAS[1].titulo}</CardTitle>
          <CardDescription>{ETAPAS[1].descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.nome}>
              <FieldLabel htmlFor="eq-nome">Nome ou identificação</FieldLabel>
              <Input id="eq-nome" placeholder="Ex.: Ar-condicionado da recepção" aria-invalid={!!errors.nome} {...register("nome")} />
              <FieldError errors={[errors.nome]} />
            </Field>
            {tipo || equipamento ? (
              <CamposDinamicos
                key={tipoId}
                campos={campos}
                control={control}
                prefixo="atributos"
                erros={errors.atributos as Record<string, unknown> | undefined}
                idBase="eq"
              />
            ) : (
              <p className="text-muted-foreground">Escolha o tipo no passo anterior para ver os campos.</p>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ───── Passo 3: periodicidade e observações ───── */}
      <Card className={visivel(2)}>
        <CardHeader>
          <CardTitle className="text-lg">{ETAPAS[2].titulo}</CardTitle>
          <CardDescription>{ETAPAS[2].descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.periodicidadeDias}>
              <FieldLabel htmlFor="eq-periodicidade">Manutenção a cada quantos dias?</FieldLabel>
              <Input
                id="eq-periodicidade"
                type="number"
                inputMode="numeric"
                min={1}
                aria-invalid={!!errors.periodicidadeDias}
                {...register("periodicidadeDias", { valueAsNumber: true })}
              />
              <FieldDescription>
                {tipo ? `O padrão do tipo "${tipo.nome}" é ${tipo.periodicidadePadraoDias} dias. ` : ""}
                A próxima data de cada serviço é calculada com este prazo.
              </FieldDescription>
              <FieldError errors={[errors.periodicidadeDias]} />
            </Field>

            <Controller
              control={control}
              name="observacoes"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="eq-obs">Observações (opcional)</FieldLabel>
                  <Textarea id="eq-obs" rows={4} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ───── Botões ───── */}
      <div className="flex flex-col gap-3">
        {/* Celular: avançar / voltar de etapa */}
        <div className="flex flex-col gap-3 md:hidden">
          {etapa < ultima && (
            <Button type="button" size="lg" onClick={proxima}>
              Próximo
              <ArrowRight aria-hidden />
            </Button>
          )}
          {etapa > 0 && (
            <Button type="button" size="lg" variant="outline" onClick={() => setEtapa((e) => Math.max(e - 1, 0))}>
              <ArrowLeft aria-hidden />
              Voltar
            </Button>
          )}
        </div>
        <Button type="submit" size="lg" disabled={enviando} className={cn(etapa === ultima ? "" : "hidden", "md:inline-flex")}>
          {enviando ? <Spinner /> : <Save aria-hidden />}
          {enviando ? "Salvando..." : "Salvar equipamento"}
        </Button>
      </div>
    </form>
  );
}
