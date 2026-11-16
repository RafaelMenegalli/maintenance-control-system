import type {
  EquipamentoDetalhe,
  EquipamentoResumo,
  FiltrosEquipamentos,
  LocalDTO,
  OpcoesServicos,
  PainelTecnico,
  ServicoDetalhe,
  TipoEquipamentoDTO,
} from "./types";

/**
 * Contrato da camada de dados do técnico.
 *
 * REGRA DE OURO DO OFFLINE (docs/ESCOPO.md, seção 7): as telas do técnico que
 * funcionam offline são Client Components e só acessam dados por aqui (via os hooks
 * em ./hooks). Hoje a implementação é `fetchRepositorio` (route handlers em
 * /api/tecnico/*). Na etapa 5 ela passa a ler/gravar no IndexedDB (Dexie) e a
 * sincronizar — trocando só a linha de `./index.ts`, sem tocar nas telas.
 *
 * Todo método devolve dados já prontos para exibir (inclusive `status`).
 */
export interface RepositorioTecnico {
  /** Equipamentos com status. Aplica os filtros (busca, tipo, local, status). */
  listarEquipamentos(filtros?: FiltrosEquipamentos): Promise<EquipamentoResumo[]>;
  obterEquipamento(id: string): Promise<EquipamentoDetalhe | null>;
  /** Serviços de um equipamento, do mais recente para o mais antigo. */
  listarServicos(equipamentoId: string, opcoes?: OpcoesServicos): Promise<ServicoDetalhe[]>;
  listarTipos(): Promise<TipoEquipamentoDTO[]>;
  listarLocais(): Promise<LocalDTO[]>;
  /** Vencidos, que vencem em até 15 dias e sem registro (para o painel da tela inicial). */
  obterPainel(): Promise<PainelTecnico>;
}
