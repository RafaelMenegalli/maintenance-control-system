import type { MomentoFoto, TipoServico } from "@/db/schema";
import type { Atributos, CampoDefinicao } from "@/lib/schemas/campo";
import type { ItemChecklist, RespostaChecklist } from "@/lib/schemas/checklist";
import type { StatusEquipamento } from "@/lib/status";

/**
 * Tipos da camada de dados do técnico (lib/tecnico/data).
 *
 * São DTOs "planos" (datas como string, sem objetos Drizzle) para que a MESMA
 * interface possa ser atendida pela API (hoje) e pelo IndexedDB/Dexie (etapa 5)
 * sem alterar nenhuma tela.
 */

export type TipoEquipamentoDTO = {
  id: string;
  nome: string;
  icone: string | null;
  campos: CampoDefinicao[];
  checklist: ItemChecklist[];
  periodicidadePadraoDias: number;
  ativo: boolean;
  /** Quantos equipamentos usam este tipo (inclui arquivados). */
  quantidadeEquipamentos: number;
};

/** Tipo com o uso de cada campo (para avisar antes de remover um campo que já tem valores). */
export type TipoEquipamentoDetalhe = TipoEquipamentoDTO & {
  /** key do campo → quantos equipamentos têm valor preenchido nele. */
  usoCampos: Record<string, number>;
};

export type LocalDTO = {
  id: string;
  nome: string;
  clienteId: string;
  clienteNome: string;
  quantidadeEquipamentos: number;
};

export type ClienteDTO = {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  locais: LocalDTO[];
};

export type EquipamentoResumo = {
  id: string;
  nome: string;
  tipoId: string;
  tipoNome: string;
  tipoIcone: string | null;
  localId: string;
  localNome: string;
  clienteId: string;
  periodicidadeDias: number;
  arquivado: boolean;
  /** Data (yyyy-mm-dd) do último serviço, ou null se nunca teve. */
  ultimoServicoEm: string | null;
  /** `proxima_data` do último serviço (yyyy-mm-dd), ou null. */
  proximaData: string | null;
  /** Calculado a partir de `proximaData` (ver lib/status.ts). */
  status: StatusEquipamento;
};

export type EquipamentoDetalhe = EquipamentoResumo & {
  atributos: Atributos;
  observacoes: string | null;
  /** Campos e checklist atuais do tipo (para montar o formulário e o registro de serviço). */
  campos: CampoDefinicao[];
  checklist: ItemChecklist[];
  criadoEm: string;
  atualizadoEm: string;
};

export type FotoResumo = {
  id: string;
  momento: MomentoFoto;
  largura: number | null;
  altura: number | null;
  /** Foto ainda só no celular (serviço aguardando envio): endereço local (blob:) em vez de /api/fotos. */
  url?: string;
};

export type ServicoDetalhe = {
  id: string;
  equipamentoId: string;
  tipo: TipoServico;
  data: string;
  descricao: string | null;
  checklist: RespostaChecklist[];
  proximaData: string | null;
  criadoPor: string | null;
  criadoPorNome: string | null;
  criadoEm: string;
  fotos: FotoResumo[];
  /** `true` enquanto o serviço está só no celular, na fila de envio (selo "Aguardando envio"). */
  pendente?: boolean;
};

export type FiltrosEquipamentos = {
  /** Busca por nome, local ou tipo (sem diferenciar maiúsculas nem acentos). */
  busca?: string;
  tipoId?: string;
  localId?: string;
  status?: StatusEquipamento;
  incluirArquivados?: boolean;
};

export type OpcoesServicos = {
  /** Quantidade máxima (mais recentes primeiro). */
  limite?: number;
};

export type PainelTecnico = {
  vencidos: EquipamentoResumo[];
  venceEmBreve: EquipamentoResumo[];
  semRegistro: EquipamentoResumo[];
};

/** Serviço resumido, com o equipamento (painel e "usados recentemente"). */
export type ServicoRecente = {
  id: string;
  data: string;
  tipo: TipoServico;
  criadoEm: string;
  equipamentoId: string;
  equipamentoNome: string;
  localNome: string;
  tipoEquipamentoNome: string;
  tipoEquipamentoIcone: string | null;
  criadoPorNome: string | null;
};

/** Uma foto pronta para enviar (já comprimida no navegador). */
export type FotoParaEnviar = {
  /** UUID gerado no navegador quando a foto é escolhida. */
  id: string;
  momento: MomentoFoto;
  arquivo: Blob;
};

/** Andamento do envio de um serviço: fotos primeiro, depois o serviço. */
export type ProgressoEnvio = {
  etapa: "fotos" | "servico";
  /** Fotos já enviadas / total de fotos a enviar. */
  fotosEnviadas: number;
  totalFotos: number;
  /** 0 a 100, considerando o envio de todas as fotos e do serviço. */
  percentual: number;
};

/** Dados do serviço novo (sem as fotos, que vão à parte). Ver ServicoInput em lib/schemas/entidades.ts. */
export type NovoServico = Omit<import("@/lib/schemas/entidades").ServicoInput, "fotos">;
/** Dados editáveis de um serviço existente. */
export type EdicaoServico = Omit<import("@/lib/schemas/entidades").ServicoEdicaoInput, "fotosNovas" | "fotosRemovidas">;
