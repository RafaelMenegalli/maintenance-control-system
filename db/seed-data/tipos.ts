import type { CampoDefinicao } from "@/lib/schemas/campo";
import type { ItemChecklist } from "@/lib/schemas/checklist";

/** Tipos de equipamento pré-cadastrados — docs/ESCOPO.md, seção 4. */
export type TipoSeed = {
  nome: string;
  icone: string;
  periodicidadePadraoDias: number;
  campos: CampoDefinicao[];
  checklist: ItemChecklist[];
};

const texto = (key: string, label: string, obrigatorio = false): CampoDefinicao => ({
  key,
  label,
  type: "texto",
  obrigatorio,
});
const numero = (key: string, label: string, unidade: string): CampoDefinicao => ({
  key,
  label,
  type: "numero",
  unidade,
  obrigatorio: false,
});
const selecao = (key: string, label: string, options: string[]): CampoDefinicao => ({
  key,
  label,
  type: "selecao",
  options,
  obrigatorio: false,
});

export const TIPOS_SEED: TipoSeed[] = [
  {
    nome: "Ar-condicionado",
    icone: "AirVent",
    periodicidadePadraoDias: 90,
    campos: [
      texto("local_sala", "Local/sala"),
      texto("marca", "Marca"),
      texto("modelo", "Modelo"),
      selecao("tipo", "Tipo", ["Split", "Janela", "Cassete", "Piso-teto", "Outro"]),
      numero("capacidade", "Capacidade", "BTUs"),
      texto("numero_serie", "Nº de série"),
    ],
    checklist: [
      { key: "filtros_limpos", label: "Filtros limpos" },
      { key: "evaporadora_limpa", label: "Evaporadora limpa" },
      { key: "dreno_desobstruido", label: "Dreno desobstruído" },
      { key: "condensadora_verificada", label: "Condensadora verificada" },
      { key: "resfriando_normalmente", label: "Aparelho resfriando normalmente" },
    ],
  },
  {
    nome: "Caixa d'água",
    icone: "Droplets",
    periodicidadePadraoDias: 180,
    campos: [
      numero("capacidade", "Capacidade", "litros"),
      selecao("material", "Material", ["Polietileno", "Fibra", "Concreto", "Outro"]),
      texto("tipo_tampa", "Tipo de tampa"),
    ],
    checklist: [
      { key: "esvaziamento_realizado", label: "Esvaziamento realizado" },
      { key: "limpeza_desinfeccao", label: "Limpeza e desinfecção realizadas" },
      { key: "tampa_vedada", label: "Tampa bem vedada" },
      { key: "sem_trincas_vazamentos", label: "Sem trincas ou vazamentos" },
      { key: "boia_funcionando", label: "Boia funcionando" },
    ],
  },
  {
    nome: "Porta corta-fogo (NBR 11742)",
    icone: "DoorClosed",
    periodicidadePadraoDias: 30,
    campos: [
      texto("identificacao", "Identificação"),
      texto("fabricante", "Fabricante"),
      selecao("classe", "Classe", ["P-30", "P-60", "P-90", "P-120"]),
      texto("selo_conformidade", "Nº de série do selo de conformidade"),
      texto("fabricacao", "Mês/ano de fabricação (MM/AAAA)"),
      selecao("tipo_fechamento", "Tipo de fechamento", ["Dobradiça com mola", "Mola aérea"]),
      selecao("acionamento", "Acionamento", ["Maçaneta", "Barra antipânico"]),
    ],
    checklist: [
      { key: "fecha_sozinha", label: "Fecha sozinha e por completo" },
      { key: "fechadura_barra_trincos", label: "Fechadura, barra antipânico e trincos funcionando" },
      { key: "dobradicas_lubrificadas", label: "Dobradiças e trincos limpos e lubrificados" },
      { key: "folga_soleira", label: "Folga entre folha e soleira de 5 a 10 mm" },
      { key: "folha_sem_corrosao", label: "Folha sem corrosão ou amassados" },
      { key: "plaqueta_legivel", label: "Plaqueta de identificação legível" },
      {
        key: "letreiro",
        label: "Letreiro \"Porta corta-fogo, é obrigatório manter fechada\"",
      },
      { key: "passagem_desobstruida", label: "Passagem desobstruída" },
    ],
  },
  {
    nome: "Luz de emergência (NBR 10898)",
    icone: "Lightbulb",
    periodicidadePadraoDias: 30,
    campos: [
      selecao("tipo_sistema", "Tipo de sistema", [
        "Bloco autônomo",
        "Centralizado com baterias",
        "Grupo motogerador",
      ]),
      texto("marca_modelo", "Marca/modelo"),
      numero("autonomia", "Autonomia declarada", "horas"),
      texto("tipo_bateria", "Tipo de bateria"),
      { key: "ultima_troca_bateria", label: "Data da última troca de bateria", type: "data", obrigatorio: false },
    ],
    checklist: [
      { key: "acende_sem_energia", label: "Acende ao simular falta de energia (botão de teste)" },
      { key: "indicador_carga", label: "Indicador de carga funcionando" },
      { key: "mantem_luz_1h", label: "Mantém a luz por pelo menos 1 hora" },
      { key: "lente_fixacao", label: "Lente limpa e fixação firme" },
      { key: "bateria_vida_util", label: "Bateria dentro da vida útil" },
    ],
  },
];
