/**
 * Ícones disponíveis para os tipos de equipamento (nomes do lucide-react).
 * Sem importar o lucide aqui: este arquivo também é usado no servidor (validação).
 * O mapa nome → componente fica em components/icone-tipo.tsx.
 */
export const ICONES_TIPO = [
  { nome: "AirVent", rotulo: "Ar-condicionado" },
  { nome: "Droplets", rotulo: "Água" },
  { nome: "DoorClosed", rotulo: "Porta" },
  { nome: "Lightbulb", rotulo: "Lâmpada" },
  { nome: "Flame", rotulo: "Fogo / extintor" },
  { nome: "Zap", rotulo: "Energia" },
  { nome: "Fan", rotulo: "Ventilação" },
  { nome: "Thermometer", rotulo: "Temperatura" },
  { nome: "Gauge", rotulo: "Medidor" },
  { nome: "ShieldCheck", rotulo: "Segurança" },
  { nome: "Wrench", rotulo: "Ferramenta" },
  { nome: "Plug", rotulo: "Tomada" },
] as const;

export type NomeIcone = (typeof ICONES_TIPO)[number]["nome"];
export const NOMES_ICONES = ICONES_TIPO.map((i) => i.nome) as [NomeIcone, ...NomeIcone[]];
export const ICONE_PADRAO: NomeIcone = "Wrench";
