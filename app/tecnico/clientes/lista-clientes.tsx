"use client";

import { Building2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatarNumero } from "@/lib/format";
import { repositorio, useClientes, type ClienteDTO, type LocalDTO } from "@/lib/tecnico/data";
import { DialogoCliente, DialogoLocal } from "./formularios";

type Janela =
  | { tipo: "cliente"; cliente?: ClienteDTO }
  | { tipo: "local"; cliente: ClienteDTO; local?: LocalDTO }
  | { tipo: "excluir-local"; local: LocalDTO };

export function ListaClientes() {
  const { dados: clientes, carregando, erro, recarregar } = useClientes();
  const [janela, setJanela] = useState<Janela | null>(null);
  const fechar = () => setJanela(null);

  if (!clientes) {
    if (erro) return <ErroAoCarregar mensagem={erro} aoTentar={recarregar} />;
    return <CarregandoLista />;
  }

  const localParaExcluir = janela?.tipo === "excluir-local" ? janela.local : null;

  return (
    <div className="flex flex-col gap-4">
      {clientes.length > 0 && (
        <div>
          <Button size="lg" className="w-full sm:w-auto" onClick={() => setJanela({ tipo: "cliente" })}>
            <Plus aria-hidden />
            Novo cliente
          </Button>
        </div>
      )}

      {clientes.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Nenhum cliente cadastrado</EmptyTitle>
            <EmptyDescription>
              Cadastre a empresa que você atende. Depois, adicione os locais dela (por exemplo, Bloco A e Cobertura).
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" onClick={() => setJanela({ tipo: "cliente" })}>
              <Plus aria-hidden />
              Cadastrar cliente
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {clientes.map((cliente) => (
        <Card key={cliente.id}>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                <p className="mt-1 text-muted-foreground">
                  {[cliente.cnpj && `CNPJ ${cliente.cnpj}`, cliente.contato].filter(Boolean).join(" · ") ||
                    "Sem CNPJ ou contato"}
                </p>
              </div>
              <Button variant="outline" onClick={() => setJanela({ tipo: "cliente", cliente })}>
                <Pencil aria-hidden />
                Editar cliente
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <h3 className="font-semibold">Locais</h3>
            {cliente.locais.length === 0 && (
              <p className="text-muted-foreground">Nenhum local ainda. Adicione o primeiro para poder cadastrar equipamentos.</p>
            )}
            <ul className="flex flex-col gap-3">
              {cliente.locais.map((local) => (
                <li key={local.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p className="font-medium">{local.nome}</p>
                      <p className="text-muted-foreground">
                        {local.quantidadeEquipamentos === 0
                          ? "Nenhum equipamento"
                          : `${formatarNumero(local.quantidadeEquipamentos, 0)} equipamento${local.quantidadeEquipamentos === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="min-w-0" onClick={() => setJanela({ tipo: "local", cliente, local })}>
                      <Pencil aria-hidden />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="min-w-0"
                      onClick={() => setJanela({ tipo: "excluir-local", local })}
                    >
                      <Trash2 aria-hidden />
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto sm:self-start" onClick={() => setJanela({ tipo: "local", cliente })}>
              <Plus aria-hidden />
              Novo local
            </Button>
          </CardContent>
        </Card>
      ))}

      <DialogoCliente
        aberto={janela?.tipo === "cliente"}
        onAbertoChange={(v) => !v && fechar()}
        cliente={janela?.tipo === "cliente" ? janela.cliente : undefined}
      />

      {janela?.tipo === "local" && (
        <DialogoLocal
          aberto
          onAbertoChange={(v) => !v && fechar()}
          cliente={janela.cliente}
          local={janela.local}
        />
      )}

      {localParaExcluir && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && fechar()}
          destrutivo
          titulo={localParaExcluir.quantidadeEquipamentos > 0 ? "Este local não pode ser excluído" : "Excluir este local?"}
          descricao={
            localParaExcluir.quantidadeEquipamentos > 0
              ? `O local "${localParaExcluir.nome}" tem ${localParaExcluir.quantidadeEquipamentos} equipamento${localParaExcluir.quantidadeEquipamentos === 1 ? "" : "s"}. Para excluí-lo, primeiro mude os equipamentos para outro local ou arquive-os.`
              : `O local "${localParaExcluir.nome}" será removido. Esta ação não pode ser desfeita.`
          }
          rotuloConfirmar="Excluir local"
          onConfirmar={
            localParaExcluir.quantidadeEquipamentos > 0
              ? undefined
              : async () => {
                  try {
                    await repositorio.excluirLocal(localParaExcluir.id);
                    toast.success("Local excluído");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
                    throw e;
                  }
                }
          }
        />
      )}
      {carregando && clientes.length > 0 && <span className="sr-only">Atualizando...</span>}
    </div>
  );
}
