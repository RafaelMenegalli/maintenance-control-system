import type { ClienteInput, EquipamentoInput, LocalInput, TipoInput } from "@/lib/schemas/entidades";
import type {
  ClienteDTO,
  EquipamentoDetalhe,
  EquipamentoResumo,
  EdicaoServico,
  FiltrosEquipamentos,
  FotoParaEnviar,
  LocalDTO,
  NovoServico,
  OpcoesServicos,
  PainelTecnico,
  ProgressoEnvio,
  ServicoDetalhe,
  ServicoRecente,
  TipoEquipamentoDetalhe,
  TipoEquipamentoDTO,
} from "./types";

/**
 * Contrato da camada de dados do técnico.
 *
 * REGRA DE OURO DO OFFLINE (docs/ESCOPO.md, seção 7): as telas do técnico que
 * funcionam offline são Client Components e só acessam dados por aqui (via os hooks
 * em ./hooks e as ações exportadas em ./index). Hoje a implementação é `fetchRepositorio`
 * (route handlers em /api/tecnico/*). Na etapa 5 ela passa a ler/gravar no IndexedDB
 * (Dexie) e a sincronizar — trocando só ./atual.ts, sem tocar nas telas.
 *
 * Toda escrita que der certo avisa os hooks (`notificarMudanca`) para recarregarem.
 * Cadastros (clientes, locais, tipos, equipamentos) exigem internet.
 */
export interface RepositorioTecnico {
  // ── Leitura ──
  /** Todos os equipamentos com status (inclui arquivados; os filtros são aplicados em memória). */
  listarEquipamentos(filtros?: FiltrosEquipamentos): Promise<EquipamentoResumo[]>;
  obterEquipamento(id: string): Promise<EquipamentoDetalhe | null>;
  /** Serviços de um equipamento, do mais recente para o mais antigo. */
  listarServicos(equipamentoId: string, opcoes?: OpcoesServicos): Promise<ServicoDetalhe[]>;
  listarTipos(): Promise<TipoEquipamentoDTO[]>;
  obterTipo(id: string): Promise<TipoEquipamentoDetalhe | null>;
  listarLocais(): Promise<LocalDTO[]>;
  listarClientes(): Promise<ClienteDTO[]>;
  /** Serviços mais recentes de todos os equipamentos (mais novo primeiro). */
  listarServicosRecentes(limite?: number): Promise<ServicoRecente[]>;
  /** Vencidos, que vencem em até 15 dias e sem registro (para o painel da tela inicial). */
  obterPainel(): Promise<PainelTecnico>;

  // ── Escrita (cadastros) ──
  /** Cria o cliente, ou edita se `id` já existir. */
  salvarCliente(dados: ClienteInput): Promise<{ id: string }>;
  salvarLocal(dados: LocalInput): Promise<{ id: string }>;
  /** Só funciona se o local não tiver equipamentos (a mensagem de erro explica). */
  excluirLocal(id: string): Promise<void>;
  salvarTipo(dados: TipoInput): Promise<{ id: string }>;
  /** `ativo: false` arquiva o tipo. */
  definirTipoAtivo(id: string, ativo: boolean): Promise<void>;
  /** Só funciona se o tipo não tiver equipamentos. */
  excluirTipo(id: string): Promise<void>;
  salvarEquipamento(dados: EquipamentoInput): Promise<{ id: string }>;
  arquivarEquipamento(id: string, arquivar: boolean): Promise<void>;

  // ── Serviços ──
  /**
   * Salva um serviço novo. O `id` do serviço e os das fotos são UUIDs gerados no navegador.
   * Ordem do envio: primeiro as fotos (já comprimidas), depois o serviço — ambos IDEMPOTENTES,
   * então repetir a chamada (duplo toque, nova tentativa) nunca duplica nada.
   * Na etapa 5 (offline) isto passa a gravar na fila local e sincronizar depois.
   */
  salvarServico(
    dados: NovoServico,
    fotos: FotoParaEnviar[],
    aoProgredir?: (progresso: ProgressoEnvio) => void,
  ): Promise<{ id: string }>;
  /** Edita um serviço (só online): troca dados, envia fotos novas e remove as indicadas. */
  editarServico(
    id: string,
    dados: EdicaoServico,
    fotosNovas: FotoParaEnviar[],
    fotosRemovidas: string[],
    aoProgredir?: (progresso: ProgressoEnvio) => void,
  ): Promise<void>;
  /** Exclui o serviço e as fotos dele (só online). */
  excluirServico(id: string): Promise<void>;
}
