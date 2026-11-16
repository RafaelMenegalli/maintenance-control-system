"use client";

import { CircleAlert, CircleCheck, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { DialogoResponsivo } from "@/components/dialogo-responsivo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatarData, formatarDataHora } from "@/lib/format";
import { sincronizar, tentarDeNovo } from "@/lib/tecnico/sync";
import { assinarEstado, lerEstado } from "@/lib/tecnico/sync/estado";
import { usePendencias } from "@/lib/tecnico/sync/pendencias";
import { cn } from "@/lib/utils";

function assinarRede(aoMudar: () => void) {
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => {
    window.removeEventListener("online", aoMudar);
    window.removeEventListener("offline", aoMudar);
  };
}

const plural = (n: number) => (n === 1 ? "1 serviço" : `${n} serviços`);

type Visao = {
  /** Cores: classes de borda/fundo/texto dos tokens de status (cor E texto, nunca só cor). */
  classes: string;
  Icone: typeof CircleCheck | null;
  carregando: boolean;
  texto: string;
};

const VERDE = "border-em-dia-border bg-em-dia text-em-dia-foreground";
const AMBAR = "border-vence-em-breve-border bg-vence-em-breve text-vence-em-breve-foreground";
const VERMELHO = "border-vencido-border bg-vencido text-vencido-foreground";
const NEUTRO = "border-primary bg-accent text-primary";

/**
 * Indicador de sincronização do cabeçalho do técnico (sempre visível, com ícone e texto).
 * Toque: abre a gaveta com as pendências, a última sincronização e o botão "Sincronizar agora".
 */
export function IndicadorSincronizacao() {
  const estado = useSyncExternalStore(assinarEstado, lerEstado, lerEstado);
  const navegadorOnline = useSyncExternalStore(
    assinarRede,
    () => navigator.onLine,
    () => true,
  );
  const pendencias = usePendencias();
  const [aberto, setAberto] = useState(false);

  const total = pendencias?.length ?? 0;
  const recusados = pendencias?.filter((p) => p.recusado).length ?? 0;
  const semInternet = !navegadorOnline || estado.semInternet;

  let visao: Visao;
  if (estado.sessaoExpirada || recusados > 0 || (estado.erro && !semInternet)) {
    visao = { classes: VERMELHO, Icone: CircleAlert, carregando: false, texto: "Erro ao enviar — toque para tentar de novo" };
  } else if (semInternet) {
    visao = {
      classes: AMBAR,
      Icone: CloudOff,
      carregando: false,
      texto: total > 0 ? `Sem internet — ${plural(total)} salvo${total === 1 ? "" : "s"} no celular` : "Sem internet",
    };
  } else if (estado.sincronizando && total > 0) {
    visao = { classes: NEUTRO, Icone: null, carregando: true, texto: `Enviando ${plural(estado.enviando || total)}...` };
  } else if (total > 0) {
    visao = { classes: AMBAR, Icone: RefreshCw, carregando: false, texto: `${plural(total)} aguardando envio` };
  } else {
    visao = { classes: VERDE, Icone: CircleCheck, carregando: false, texto: "Tudo enviado" };
  }

  async function sincronizarAgora() {
    const r = await sincronizar({ forcar: true });
    if (r.situacao === "ok") toast.success(r.enviados > 0 ? `${plural(r.enviados)} enviado${r.enviados === 1 ? "" : "s"}` : "Tudo atualizado");
    else if (r.situacao === "sem-internet") toast.error("Sem internet. Seus serviços continuam salvos no celular.");
    else if (r.situacao === "sessao-expirada") toast.error("Sua sessão terminou. Entre de novo.");
    else if (r.situacao === "erro") toast.error(r.mensagem);
  }

  return (
    <div data-slot="indicador-sincronizacao" className="max-w-full min-w-0">
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border-2 px-3 py-1 text-left text-sm leading-tight font-semibold",
          visao.classes,
        )}
      >
        {visao.carregando ? <Spinner className="size-4 shrink-0" /> : visao.Icone ? <visao.Icone className="size-4 shrink-0" aria-hidden /> : null}
        <span>{visao.texto}</span>
      </button>

      <DialogoResponsivo
        aberto={aberto}
        onAbertoChange={setAberto}
        titulo="Envio dos serviços"
        descricao="Os serviços registrados sem internet ficam salvos no celular e sobem sozinhos quando a conexão volta."
      >
        <div className="flex flex-col gap-4">
          <p className={cn("rounded-lg border-2 p-3 text-base font-semibold", visao.classes)}>{visao.texto}</p>

          {estado.sessaoExpirada && (
            <p className="text-base">
              Sua sessão terminou. Seus serviços continuam guardados neste celular.{" "}
              <Link href="/login?voltar=/tecnico" className="font-semibold text-primary underline underline-offset-4">
                Entrar de novo
              </Link>
            </p>
          )}

          <section aria-label="Pendências" className="flex flex-col gap-2">
            <h3 className="text-lg font-bold">Aguardando envio</h3>
            {total === 0 ? (
              <p className="text-muted-foreground">Nenhum serviço pendente.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pendencias!.map((p) => (
                  <li key={p.id} className="flex flex-col gap-1 rounded-lg border-2 p-3">
                    <p className="font-semibold">{p.equipamentoNome}</p>
                    <p className="text-muted-foreground">
                      Serviço de {formatarData(p.data)}
                      {p.quantidadeFotos > 0 ? ` · ${p.quantidadeFotos} ${p.quantidadeFotos === 1 ? "foto" : "fotos"}` : ""}
                    </p>
                    {p.erro && <p className={cn("font-medium", p.recusado ? "text-vencido-foreground" : "text-muted-foreground")}>{p.erro}</p>}
                    {p.recusado && (
                      <Button variant="outline" onClick={() => void tentarDeNovo(p.id).then(() => sincronizarAgora())}>
                        <RefreshCw aria-hidden />
                        Tentar de novo
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-muted-foreground">
            Última sincronização: {estado.ultimaSincronizacao ? formatarDataHora(estado.ultimaSincronizacao) : "ainda não houve nesta abertura do app"}
          </p>

          <Button size="lg" className="w-full" onClick={() => void sincronizarAgora()} disabled={estado.sincronizando}>
            {estado.sincronizando ? <Spinner /> : <RefreshCw aria-hidden />}
            {estado.sincronizando ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        </div>
      </DialogoResponsivo>
    </div>
  );
}
