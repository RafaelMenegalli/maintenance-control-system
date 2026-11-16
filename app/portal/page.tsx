import type { Metadata } from "next";
import { CalendarClock, ShieldAlert, Wrench } from "lucide-react";
import { TelaVazia } from "@/components/tela-vazia";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Equipamentos" };

export default async function PaginaPortalEquipamentos({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Equipamentos</h1>

      {aviso === "sem-acesso" && (
        <Alert variant="destructive">
          <ShieldAlert aria-hidden />
          <AlertTitle>Esta área é só do técnico</AlertTitle>
          <AlertDescription>
            O seu acesso permite consultar os equipamentos e o histórico de manutenções da sua empresa.
          </AlertDescription>
        </Alert>
      )}

      <TelaVazia
        icone={Wrench}
        titulo="Equipamentos da sua empresa"
        descricao="Aqui você vai ver todos os equipamentos, o status de cada um e o histórico de manutenções com fotos. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver próximas manutenções", href: "/portal/proximas", icone: CalendarClock }}
      />
    </div>
  );
}
