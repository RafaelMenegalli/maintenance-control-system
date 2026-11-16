import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { diasAteVencer } from "@/lib/status";

/**
 * Formatação centralizada. Toda tela deve formatar datas e números por aqui:
 * datas dd/mm/aaaa e números com vírgula decimal (escopo, seção 9).
 * Datas de calendário (`yyyy-mm-dd`) são lidas como data local, sem deslocar fuso.
 */

function paraData(valor: string | Date): Date {
  return typeof valor === "string" ? parseISO(valor) : valor;
}

/** 05/03/2026 */
export function formatarData(valor: string | Date | null | undefined, vazio = "—"): string {
  if (!valor) return vazio;
  const data = paraData(valor);
  return isValid(data) ? format(data, "dd/MM/yyyy", { locale: ptBR }) : vazio;
}

/** 05/03/2026 às 14:30 */
export function formatarDataHora(valor: string | Date | null | undefined, vazio = "—"): string {
  if (!valor) return vazio;
  const data = paraData(valor);
  return isValid(data) ? format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : vazio;
}

/** 5 de março de 2026 */
export function formatarDataExtenso(valor: string | Date | null | undefined, vazio = "—"): string {
  if (!valor) return vazio;
  const data = paraData(valor);
  return isValid(data) ? format(data, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : vazio;
}

/** 1.234,5 — vírgula decimal e ponto de milhar. */
export function formatarNumero(valor: number | null | undefined, casasMax = 2, vazio = "—"): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return vazio;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casasMax }).format(valor);
}

/** Converte texto digitado ("12,5") em número; devolve null se inválido. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  if (limpo === "") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function plural(n: number, singular: string, pluralTxt: string): string {
  return `${n} ${n === 1 ? singular : pluralTxt}`;
}

/**
 * Texto relativo ao vencimento:
 * "vence hoje", "vence amanhã", "vence em 5 dias", "venceu ontem", "venceu há 3 dias".
 */
export function textoVencimento(proximaData: string | Date, hoje: Date = new Date()): string {
  const dias = diasAteVencer(proximaData, hoje);
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  if (dias > 1) return `vence em ${plural(dias, "dia", "dias")}`;
  if (dias === -1) return "venceu ontem";
  return `venceu há ${plural(Math.abs(dias), "dia", "dias")}`;
}

/** "5 dias", "1 dia" */
export function formatarDias(dias: number): string {
  return plural(dias, "dia", "dias");
}

/** Só os dígitos de um texto. */
export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Aplica a máscara de CNPJ enquanto a pessoa digita: 12.345.678/0001-90 */
export function mascararCnpj(texto: string): string {
  const d = somenteDigitos(texto).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Confere os dígitos verificadores do CNPJ. */
export function cnpjValido(texto: string): boolean {
  const d = somenteDigitos(texto);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d.slice(0, 12));
  const d2 = digito(d.slice(0, 12) + d1);
  return d === d.slice(0, 12) + String(d1) + String(d2);
}
