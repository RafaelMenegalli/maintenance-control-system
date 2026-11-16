import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type Props = {
  icone: LucideIcon;
  /** O que é esta tela / o que ainda não existe. */
  titulo: string;
  descricao: string;
  /** Próxima ação sugerida. */
  acao?: { rotulo: string; href: string; icone?: LucideIcon };
};

/** Estado vazio amigável: explica a tela e oferece o próximo passo. */
export function TelaVazia({ icone: Icone, titulo, descricao, acao }: Props) {
  const IconeAcao = acao?.icone;
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icone aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        <EmptyDescription>{descricao}</EmptyDescription>
      </EmptyHeader>
      {acao && (
        <EmptyContent>
          <Button asChild size="lg">
            <Link href={acao.href}>
              {IconeAcao && <IconeAcao aria-hidden />}
              {acao.rotulo}
            </Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
