/**
 * Seed de demonstração (sem fotos): 1 cliente, 3 locais, 12 equipamentos dos 4 tipos
 * e serviços com datas variadas — vencidos, em dia, vencendo em breve e sem registro.
 *
 * Rode `pnpm db:seed` antes. Idempotente: se o cliente de demonstração já existe,
 * não faz nada. As datas são relativas a hoje, então os status variam sempre do mesmo jeito.
 */
import { addDays, format, subDays } from "date-fns";
import { eq } from "drizzle-orm";
import { getSeedEnv } from "@/lib/env";
import type { Atributos } from "@/lib/schemas/campo";
import type { RespostaChecklist } from "@/lib/schemas/checklist";
import { db } from "./index";
import {
  clientes,
  equipamentos,
  locais,
  servicos,
  tiposEquipamento,
  usuarios,
  type TipoServico,
} from "./schema";

const NOME_CLIENTE_DEMO = "Condomínio Exemplo Ltda (demonstração)";

const dia = (d: Date) => format(d, "yyyy-MM-dd");

type EquipamentoDemo = {
  tipo: string; // nome do tipo no seed base
  local: string;
  nome: string;
  atributos: Atributos;
  /** Serviços: há quantos dias aconteceram e de que tipo (do mais antigo ao mais recente). */
  historico: { haDias: number; tipo: TipoServico; descricao: string; naoOk?: string[] }[];
};

const AC = "Ar-condicionado";
const CAIXA = "Caixa d'água";
const PORTA = "Porta corta-fogo (NBR 11742)";
const LUZ = "Luz de emergência (NBR 10898)";

const EQUIPAMENTOS_DEMO: EquipamentoDemo[] = [
  {
    tipo: AC, local: "Bloco A", nome: "Ar-condicionado Sala de Reuniões",
    atributos: { local_sala: "Sala de Reuniões", marca: "Springer", modelo: "Maxiflex 12", tipo: "Split", capacidade: 12000, numero_serie: "SP-0012345" },
    historico: [{ haDias: 100, tipo: "preventiva", descricao: "Limpeza dos filtros e da evaporadora. Equipamento funcionando normalmente." }], // vencido
  },
  {
    tipo: AC, local: "Bloco A", nome: "Ar-condicionado Recepção",
    atributos: { local_sala: "Recepção", marca: "Samsung", modelo: "Digital Inverter", tipo: "Split", capacidade: 18000, numero_serie: "SM-778812" },
    historico: [
      { haDias: 110, tipo: "preventiva", descricao: "Manutenção preventiva trimestral." },
      { haDias: 20, tipo: "preventiva", descricao: "Limpeza completa e verificação do gás." }, // em dia
    ],
  },
  {
    tipo: AC, local: "Bloco B", nome: "Ar-condicionado Diretoria",
    atributos: { local_sala: "Diretoria", marca: "LG", modelo: "Dual Inverter", tipo: "Split", capacidade: 24000, numero_serie: "LG-5521" },
    historico: [{ haDias: 80, tipo: "preventiva", descricao: "Limpeza dos filtros." }], // vence em breve
  },
  {
    tipo: AC, local: "Bloco B", nome: "Ar-condicionado Copa",
    atributos: { local_sala: "Copa", marca: "Midea", modelo: "Springer Carrier", tipo: "Janela", capacidade: 9000 },
    historico: [], // sem registro
  },
  {
    tipo: CAIXA, local: "Cobertura", nome: "Caixa d'água Superior",
    atributos: { capacidade: 10000, material: "Fibra", tipo_tampa: "Rosca" },
    historico: [{ haDias: 190, tipo: "limpeza", descricao: "Esvaziamento, limpeza e desinfecção." }], // vencido
  },
  {
    tipo: CAIXA, local: "Cobertura", nome: "Caixa d'água Inferior",
    atributos: { capacidade: 15000, material: "Concreto", tipo_tampa: "Placa de concreto" },
    historico: [{ haDias: 60, tipo: "limpeza", descricao: "Limpeza e desinfecção realizadas." }], // em dia
  },
  {
    tipo: PORTA, local: "Bloco A", nome: "Porta corta-fogo Escada 1",
    atributos: { identificacao: "PCF-A1", fabricante: "Metalúrgica Sul", classe: "P-90", selo_conformidade: "SC-1020", fabricacao: "03/2022", tipo_fechamento: "Dobradiça com mola", acionamento: "Barra antipânico" },
    historico: [{ haDias: 10, tipo: "inspecao", descricao: "Inspeção mensal sem ocorrências." }], // em dia
  },
  {
    tipo: PORTA, local: "Bloco B", nome: "Porta corta-fogo Escada 2",
    atributos: { identificacao: "PCF-B2", fabricante: "Metalúrgica Sul", classe: "P-60", selo_conformidade: "SC-1034", fabricacao: "11/2021", tipo_fechamento: "Mola aérea", acionamento: "Maçaneta" },
    historico: [{ haDias: 45, tipo: "corretiva", descricao: "Ajuste da mola aérea; a porta não fechava por completo.", naoOk: ["fecha_sozinha"] }], // vencido
  },
  {
    tipo: PORTA, local: "Bloco A", nome: "Porta corta-fogo Garagem",
    atributos: { identificacao: "PCF-G1", fabricante: "Aço Forte", classe: "P-120", tipo_fechamento: "Dobradiça com mola", acionamento: "Barra antipânico" },
    historico: [], // sem registro
  },
  {
    tipo: LUZ, local: "Bloco A", nome: "Luz de emergência Corredor A",
    atributos: { tipo_sistema: "Bloco autônomo", marca_modelo: "Segurimax 30 LEDs", autonomia: 3, tipo_bateria: "Chumbo-ácido selada", ultima_troca_bateria: "2025-06-10" },
    historico: [{ haDias: 25, tipo: "inspecao", descricao: "Teste de autonomia realizado." }], // vence em breve (próxima em 5 dias)
  },
  {
    tipo: LUZ, local: "Bloco B", nome: "Luz de emergência Hall B",
    atributos: { tipo_sistema: "Bloco autônomo", marca_modelo: "Intelbras LED", autonomia: 2, tipo_bateria: "Níquel-metal hidreto", ultima_troca_bateria: "2026-01-15" },
    historico: [{ haDias: 5, tipo: "inspecao", descricao: "Teste mensal sem ocorrências." }], // em dia
  },
  {
    tipo: LUZ, local: "Cobertura", nome: "Luz de emergência Escada da Cobertura",
    atributos: { tipo_sistema: "Centralizado com baterias", marca_modelo: "Central 600W", autonomia: 1, tipo_bateria: "Estacionária 12V" },
    historico: [
      { haDias: 120, tipo: "preventiva", descricao: "Troca de lâmpadas e teste de bateria." },
      { haDias: 40, tipo: "corretiva", descricao: "Substituição do módulo de carga.", naoOk: ["indicador_carga"] }, // vencido
    ],
  },
];

async function main() {
  const [jaExiste] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.nome, NOME_CLIENTE_DEMO))
    .limit(1);
  if (jaExiste) {
    console.log("• Dados de demonstração já existem (nada foi alterado).");
    return;
  }

  const tipos = await db.select().from(tiposEquipamento);
  if (tipos.length === 0) throw new Error("Rode `pnpm db:seed` antes do seed de demonstração.");
  const tipoPorNome = new Map(tipos.map((t) => [t.nome, t]));

  const [admin] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, getSeedEnv().SEED_ADMIN_EMAIL.toLowerCase()))
    .limit(1);

  const [cliente] = await db
    .insert(clientes)
    .values({ nome: NOME_CLIENTE_DEMO, cnpj: "12.345.678/0001-90", contato: "(11) 99999-0000 · contato@exemplo.com.br" })
    .returning();

  const locaisCriados = await db
    .insert(locais)
    .values(["Bloco A", "Bloco B", "Cobertura"].map((nome) => ({ clienteId: cliente.id, nome })))
    .returning();
  const localPorNome = new Map(locaisCriados.map((l) => [l.nome, l]));

  const hoje = new Date();
  let totalServicos = 0;

  for (const demo of EQUIPAMENTOS_DEMO) {
    const tipo = tipoPorNome.get(demo.tipo);
    const local = localPorNome.get(demo.local);
    if (!tipo || !local) throw new Error(`Tipo ou local não encontrado para ${demo.nome}`);

    const [equipamento] = await db
      .insert(equipamentos)
      .values({
        localId: local.id,
        tipoId: tipo.id,
        nome: demo.nome,
        periodicidadeDias: tipo.periodicidadePadraoDias,
        atributos: demo.atributos,
      })
      .returning();

    for (const s of demo.historico) {
      const data = subDays(hoje, s.haDias);
      const checklist: RespostaChecklist[] = tipo.checklist.map((item) => {
        const naoOk = s.naoOk?.includes(item.key);
        return {
          key: item.key,
          label: item.label, // snapshot do rótulo
          resultado: naoOk ? "nao_ok" : "ok",
          ...(naoOk ? { observacao: "Problema encontrado e tratado neste serviço." } : {}),
        };
      });
      await db.insert(servicos).values({
        equipamentoId: equipamento.id,
        tipo: s.tipo,
        data: dia(data),
        descricao: s.descricao,
        checklist,
        proximaData: dia(addDays(data, equipamento.periodicidadeDias)),
        criadoPor: admin?.id ?? null,
        sincronizadoEm: new Date(),
      });
      totalServicos++;
    }
    console.log(`✓ ${demo.nome} (${demo.historico.length} serviço(s))`);
  }

  console.log(
    `Demonstração criada: 1 cliente, ${locaisCriados.length} locais, ${EQUIPAMENTOS_DEMO.length} equipamentos, ${totalServicos} serviços.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("Falha no seed de demonstração:", erro);
    process.exit(1);
  });
