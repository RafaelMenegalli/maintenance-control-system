"use client";

import { CircleCheck, Download, EllipsisVertical, Share, SquarePlus, Smartphone, TriangleAlert, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { instalarAgora, useInstalacao } from "@/lib/tecnico/instalacao";

function Passo({ numero, Icone, titulo, texto }: { numero: number; Icone: LucideIcon; titulo: string; texto: string }) {
  return (
    <li className="flex items-start gap-4 rounded-xl border-2 p-4">
      <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-primary">
        <Icone className="size-7" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">
          {numero}. {titulo}
        </p>
        <p className="text-lg text-muted-foreground">{texto}</p>
      </div>
    </li>
  );
}

/** Passo a passo para instalar o app no celular (Android com botão, iPhone no Safari). */
export function Instrucoes() {
  const { podeInstalar, instalado, iphone } = useInstalacao();

  async function instalar() {
    const r = await instalarAgora();
    if (r === "instalado") toast.success("Aplicativo instalado");
    else if (r === "recusado") toast("Tudo bem. Você pode instalar depois, por aqui.");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <p className="text-lg text-muted-foreground">
        Instalado, o aplicativo abre direto na tela do celular, em tela cheia, e funciona mesmo sem internet (casa de máquinas, cobertura, subsolo).
      </p>

      {instalado && (
        <Alert className="border-2 border-em-dia-border bg-em-dia text-em-dia-foreground">
          <CircleCheck aria-hidden />
          <AlertTitle className="text-lg">O aplicativo já está instalado</AlertTitle>
          <AlertDescription className="text-base text-em-dia-foreground">Você está usando a versão instalada. Está tudo certo.</AlertDescription>
        </Alert>
      )}

      {/* Android */}
      <Card className={iphone ? "opacity-80" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Smartphone className="size-6" aria-hidden />
            Android (Chrome)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {podeInstalar && !instalado ? (
            <Button size="lg" className="h-16 w-full text-xl" onClick={instalar}>
              <Download className="size-6" aria-hidden />
              Instalar aplicativo
            </Button>
          ) : (
            !instalado && (
              <ol className="flex flex-col gap-3">
                <Passo numero={1} Icone={EllipsisVertical} titulo="Abra o menu do Chrome" texto="Toque nos três pontinhos, no canto de cima da tela." />
                <Passo numero={2} Icone={Download} titulo="Instalar aplicativo" texto={'Toque em "Instalar aplicativo" (ou "Adicionar à tela inicial").'} />
                <Passo numero={3} Icone={CircleCheck} titulo="Confirme" texto={'Toque em "Instalar". O ícone aparece na tela do celular.'} />
              </ol>
            )
          )}
        </CardContent>
      </Card>

      {/* iPhone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Smartphone className="size-6" aria-hidden />
            iPhone (Safari)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            <Passo numero={1} Icone={Share} titulo="Toque em Compartilhar" texto="É o quadrado com uma seta para cima, na barra de baixo do Safari." />
            <Passo numero={2} Icone={SquarePlus} titulo="Adicionar à Tela de Início" texto={'Role a lista e toque em "Adicionar à Tela de Início".'} />
            <Passo numero={3} Icone={CircleCheck} titulo="Toque em Adicionar" texto="O ícone do aplicativo aparece na tela do iPhone." />
          </ol>
          <Alert className="border-2 border-vence-em-breve-border bg-vence-em-breve text-vence-em-breve-foreground">
            <TriangleAlert aria-hidden />
            <AlertTitle className="text-lg">No iPhone, use sempre o aplicativo instalado</AlertTitle>
            <AlertDescription className="text-base text-vence-em-breve-foreground">
              O Safari pode apagar os dados de sites que ficam muito tempo sem abrir. Abrindo pelo ícone na Tela de Início, seus dados e os serviços
              registrados sem internet ficam protegidos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
