"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { ListaServicos } from "@/components/servico/lista-servicos";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/format";
import { repositorio, useServicos, type ServicoDetalhe } from "@/lib/tecnico/data";

/**
 * Linha do tempo do técnico: lê pela camada `lib/tecnico/data` e oferece editar/excluir.
 * (A versão só de leitura, do portal, usa `ListaServicos` direto com dados vindos do servidor.)
 */
export function LinhaDoTempo({ equipamentoId }: { equipamentoId: string }) {
  const { dados: servicos, erro, recarregar } = useServicos(equipamentoId);
  const [excluindo, setExcluindo] = useState<ServicoDetalhe | null>(null);

  if (!servicos) {
    return erro ? <ErroAoCarregar mensagem={erro} aoTentar={recarregar} /> : <CarregandoLista linhas={2} />;
  }

  return (
    <>
      <ListaServicos
        servicos={servicos}
        acoes={{
          hrefEditar: (s) => `/tecnico/equipamentos/${equipamentoId}/servicos/${s.id}/editar`,
          aoExcluir: setExcluindo,
        }}
        vazio={
          <div className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed p-4">
            <p className="text-muted-foreground">Nenhum serviço registrado neste equipamento ainda.</p>
            <Button asChild>
              <Link href={`/tecnico/equipamentos/${equipamentoId}/novo-servico`}>
                <ClipboardList aria-hidden />
                Registrar o primeiro serviço
              </Link>
            </Button>
          </div>
        }
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
