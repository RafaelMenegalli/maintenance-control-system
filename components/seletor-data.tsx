"use client";

import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { DialogoResponsivo } from "@/components/dialogo-responsivo";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { formatarData } from "@/lib/format";

type Props = {
  id?: string;
  /** Data no formato yyyy-mm-dd. */
  valor: string;
  onChange: (valor: string) => void;
  /** Título da janela do calendário. */
  titulo: string;
  /** Texto extra no botão (ex.: "Hoje"). */
  destaque?: string;
};

const hojeIso = () => format(new Date(), "yyyy-MM-dd");

/**
 * Campo de data: botão grande com a data (dd/mm/aaaa) que abre o calendário do shadcn
 * (Dialog no computador, Drawer no celular).
 */
export function SeletorData({ id, valor, onChange, titulo, destaque }: Props) {
  const [aberto, setAberto] = useState(false);
  const data = valor ? parseISO(valor) : undefined;
  const valida = data && isValid(data);

  return (
    <>
      <Button
        id={id}
        type="button"
        variant="outline"
        size="lg"
        className="w-full justify-between"
        onClick={() => setAberto(true)}
      >
        <span>
          {valida ? formatarData(valor) : "Escolher data"}
          {destaque && <span className="ml-2 text-muted-foreground">({destaque})</span>}
        </span>
        <span className="flex items-center gap-2 text-primary">
          <CalendarDays aria-hidden />
          Mudar
        </span>
      </Button>

      <DialogoResponsivo aberto={aberto} onAbertoChange={setAberto} titulo={titulo}>
        <div className="flex flex-col items-center gap-3">
          <Calendar
            mode="single"
            locale={ptBR}
            // Dias grandes o bastante para tocar com o dedo (~48 px).
            className="[--cell-size:2.85rem]"
            selected={valida ? data : undefined}
            defaultMonth={valida ? data : undefined}
            onSelect={(d) => {
              if (!d) return;
              onChange(format(d, "yyyy-MM-dd"));
              setAberto(false);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              onChange(hojeIso());
              setAberto(false);
            }}
          >
            Escolher hoje
          </Button>
        </div>
      </DialogoResponsivo>
    </>
  );
}
