"use client";

import { Archive, ArchiveRestore, ClipboardList, History, MoreVertical, Pencil, Printer, QrCode as IconeQr } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { DialogoResponsivo } from "@/components/dialogo-responsivo";
import { CarregandoLista, ErroAoCarregar } from "@/components/estados";
import { IconeTipo } from "@/components/icone-tipo";
import { QrCode, urlDoEquipamento } from "@/components/qr-code";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarData, formatarDias, formatarNumero } from "@/lib/format";
import type { CampoDefinicao, ValorAtributo } from "@/lib/schemas/campo";
import { repositorio, useEquipamento } from "@/lib/tecnico/data";

function textoDoValor(campo: CampoDefinicao, valor: ValorAtributo | undefined): string {
  if (valor === undefined || valor === null || valor === "") return "Não informado";
  switch (campo.type) {
    case "numero":
      return `${formatarNumero(Number(valor), 2)}${campo.unidade ? ` ${campo.unidade}` : ""}`;
    case "data":
      return formatarData(String(valor));
    case "sim_nao":
      return valor ? "Sim" : "Não";
    default:
      return String(valor);
  }
}

export function DetalheEquipamento({ id }: { id: string }) {
  const { dados: e, erro, recarregar } = useEquipamento(id);
  const [qrAberto, setQrAberto] = useState(false);
  const [arquivando, setArquivando] = useState(false);

  if (e === undefined) {
    if (erro) return <ErroAoCarregar mensagem={erro} aoTentar={recarregar} />;
    return <CarregandoLista linhas={3} />;
  }
  if (e === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Equipamento não encontrado</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>Este equipamento não existe mais.</span>
          <Button asChild variant="outline">
            <Link href="/tecnico/equipamentos">Voltar para a lista</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const url = urlDoEquipamento(e.id);

  return (
    <div className="flex flex-col gap-4">
      {e.arquivado && (
        <Alert>
          <Archive aria-hidden />
          <AlertTitle>Equipamento arquivado</AlertTitle>
          <AlertDescription>Ele não aparece na lista padrão. Use o menu &quot;Mais ações&quot; para desarquivar.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <IconeTipo nome={e.tipoIcone} className="size-9" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl leading-tight font-bold">{e.nome}</h2>
              <p className="text-muted-foreground">
                {e.tipoNome} · {e.localNome}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusBadge status={e.status} proximaData={e.proximaData} />
            <span className="text-muted-foreground">
              {e.ultimoServicoEm ? `Último serviço: ${formatarData(e.ultimoServicoEm)}` : "Nenhum serviço registrado"}
            </span>
          </div>
          {e.proximaData && (
            <p>
              <span className="font-medium">Próxima manutenção:</span> {formatarData(e.proximaData)}
            </p>
          )}

          <Button asChild size="lg" className="w-full">
            <Link href={`/tecnico/servicos/novo?equipamento=${encodeURIComponent(e.id)}`}>
              <ClipboardList aria-hidden />
              Registrar serviço
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto sm:self-start">
                <MoreVertical aria-hidden />
                Mais ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              <DropdownMenuItem asChild>
                <Link href={`/tecnico/equipamentos/${e.id}/editar`}>
                  <Pencil aria-hidden />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setQrAberto(true)}>
                <IconeQr aria-hidden />
                Ver QR Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setArquivando(true)}>
                {e.arquivado ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                {e.arquivado ? "Desarquivar" : "Arquivar"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do cadastro</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {e.campos.map((campo) => (
              <div key={campo.key}>
                <dt className="text-muted-foreground">{campo.label}</dt>
                <dd className="font-medium">{textoDoValor(campo, e.atributos[campo.key])}</dd>
              </div>
            ))}
            <div>
              <dt className="text-muted-foreground">Manutenção a cada</dt>
              <dd className="font-medium">{formatarDias(e.periodicidadeDias)}</dd>
            </div>
            {e.observacoes && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Observações</dt>
                <dd className="font-medium whitespace-pre-line">{e.observacoes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Área reservada para a linha do tempo de serviços (etapa 3). */}
      <Card data-slot="linha-do-tempo">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="size-5" aria-hidden />
            Histórico de serviços
          </CardTitle>
          <CardDescription>
            Aqui vai aparecer a linha do tempo com todos os serviços, checklists e fotos deste equipamento.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* QR Code */}
      <DialogoResponsivo
        aberto={qrAberto}
        onAbertoChange={setQrAberto}
        titulo="QR Code do equipamento"
        descricao="Cole a etiqueta no equipamento. Ao ler o QR com a câmera, abre esta tela."
      >
        <div className="flex flex-col items-center gap-4">
          <QrCode texto={url} alt={`QR Code de ${e.nome}`} className="w-64 max-w-full rounded-lg border" />
          <p className="text-center text-sm break-all text-muted-foreground">{url}</p>
          <p className="text-center text-muted-foreground">
            O QR Code é opcional: você sempre pode achar o equipamento pela busca.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href={`/tecnico/etiquetas?ids=${e.id}`}>
              <Printer aria-hidden />
              Imprimir etiqueta
            </Link>
          </Button>
        </div>
      </DialogoResponsivo>

      {/* Arquivar / desarquivar */}
      <DialogoConfirmacao
        aberto={arquivando}
        onAbertoChange={setArquivando}
        titulo={e.arquivado ? "Desarquivar este equipamento?" : "Arquivar este equipamento?"}
        descricao={
          e.arquivado
            ? `"${e.nome}" volta a aparecer na lista de equipamentos.`
            : `"${e.nome}" deixa de aparecer na lista padrão e no painel. Nada é apagado: o histórico de serviços continua guardado e dá para desarquivar quando quiser.`
        }
        rotuloConfirmar={e.arquivado ? "Desarquivar" : "Arquivar equipamento"}
        onConfirmar={async () => {
          try {
            await repositorio.arquivarEquipamento(e.id, !e.arquivado);
            toast.success(e.arquivado ? "Equipamento desarquivado" : "Equipamento arquivado");
          } catch (erroAcao) {
            toast.error(erroAcao instanceof Error ? erroAcao.message : "Não foi possível concluir.");
            throw erroAcao;
          }
        }}
      />
    </div>
  );
}
