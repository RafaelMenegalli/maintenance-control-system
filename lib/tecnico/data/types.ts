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
};

export type LocalDTO = {
  id: string;
  nome: string;
  clienteId: string;
  clienteNome: string;
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
  criadoEm: string;
  fotos: FotoResumo[];
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
