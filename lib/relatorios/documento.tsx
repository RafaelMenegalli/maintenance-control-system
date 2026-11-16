/* eslint-disable jsx-a11y/alt-text -- <Image> do @react-pdf/renderer (não é <img> do HTML) */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatarData } from "@/lib/format";
import type { DadosRelatorio, ServicoDoRelatorio } from "@/lib/relatorios/dados";

/**
 * Documento PDF do relatório (docs/ESCOPO.md, seção 6):
 * 1 cabeçalho · 2 resumo · 3 tabela de serviços · 4 detalhe de cada serviço · 5 próximas manutenções ·
 * 6 assinaturas (no fim do documento) e "Página X de Y" em todas as páginas.
 * Visual sóbrio: Helvetica, cinzas, linhas alternadas suaves; só o "Não OK" e o "Vencida" ganham destaque.
 */

// Sem hifenização automática (ela é feita para inglês e quebra palavras em português).
Font.registerHyphenationCallback((palavra) => [palavra]);

const COR = {
  texto: "#1f2937",
  suave: "#6b7280",
  linha: "#d1d5db",
  faixa: "#f3f4f6",
  cabecalho: "#e5e7eb",
  erroFundo: "#fee2e2",
  erroTexto: "#991b1b",
};

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 56, fontFamily: "Helvetica", fontSize: 9.5, color: COR.texto, lineHeight: 1.35 },
  rodapeEsquerda: { position: "absolute", left: 40, bottom: 24, width: 340, fontSize: 8.5, color: COR.suave },
  // Texto com `render` (número da página): com `bottom` o react-pdf calcula uma posição absurda e com altura
  // fixa ele some; por isso `top` (em pontos a partir do topo da folha A4 de 841,89: 806 = 36 pt do rodapé), sem altura.
  numeroPagina: { position: "absolute", left: 395, top: 806, width: 160, textAlign: "right", fontSize: 8.5, color: COR.suave },
  titulo: { fontSize: 20, lineHeight: 1.2, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  subtitulo: { fontSize: 11, lineHeight: 1.2, color: COR.suave, marginBottom: 12 },
  quadroDados: { borderWidth: 0.75, borderColor: COR.linha, borderRadius: 3, padding: 10, marginBottom: 16, gap: 4 },
  linhaDado: { flexDirection: "row" },
  rotuloDado: { width: 95, color: COR.suave },
  valorDado: { flex: 1, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 12.5, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: COR.texto },
  vazio: { color: COR.suave },
  // Resumo
  indicadores: { flexDirection: "row", gap: 8, marginBottom: 10 },
  indicador: { flex: 1, borderWidth: 0.75, borderColor: COR.linha, borderRadius: 3, padding: 8 },
  indicadorNumero: { fontSize: 18, lineHeight: 1.2, fontFamily: "Helvetica-Bold" },
  indicadorRotulo: { fontSize: 8.5, lineHeight: 1.3, color: COR.suave },
  colunasResumo: { flexDirection: "row", gap: 16 },
  colunaResumo: { flex: 1 },
  h3: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  itemResumo: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5, paddingHorizontal: 4 },
  // Tabelas
  cabecalhoTabela: { flexDirection: "row", backgroundColor: COR.cabecalho, paddingVertical: 4, paddingHorizontal: 4, fontFamily: "Helvetica-Bold", fontSize: 9 },
  linhaTabela: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COR.linha },
  linhaPar: { backgroundColor: COR.faixa },
  celula: { paddingRight: 6 },
  // Detalhe
  blocoServico: { borderWidth: 0.75, borderColor: COR.linha, borderRadius: 3, marginBottom: 10 },
  topoServico: { backgroundColor: COR.cabecalho, paddingVertical: 5, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-between" },
  topoTitulo: { fontFamily: "Helvetica-Bold", flex: 1, paddingRight: 8 },
  corpoServico: { padding: 8, gap: 6 },
  rotuloSecao: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: COR.suave, textTransform: "uppercase", marginBottom: 2 },
  itemChecklist: { flexDirection: "row", paddingVertical: 2.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COR.linha },
  resultado: { width: 42, textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 8.5, paddingVertical: 1 },
  resultadoNaoOk: { backgroundColor: COR.erroFundo, color: COR.erroTexto, borderRadius: 2 },
  observacao: { color: COR.suave, fontSize: 8.5 },
  fotos: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  foto: { width: 118 },
  fotoImagem: { width: 118, height: 88, objectFit: "cover", borderWidth: 0.5, borderColor: COR.linha },
  fotoLegenda: { fontSize: 8, color: COR.suave, textAlign: "center", marginTop: 1 },
  // Assinaturas
  assinaturas: { flexDirection: "row", gap: 36, marginTop: 44 },
  assinatura: { flex: 1, borderTopWidth: 0.75, borderTopColor: COR.texto, paddingTop: 4 },
  assinaturaNome: { fontFamily: "Helvetica-Bold" },
  assinaturaPapel: { color: COR.suave, fontSize: 8.5 },
});

const ROTULO_RESULTADO = { ok: "OK", nao_ok: "Não OK", na: "N/A" } as const;

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={s.linhaDado}>
      <Text style={s.rotuloDado}>{rotulo}</Text>
      <Text style={s.valorDado}>{valor}</Text>
    </View>
  );
}

function curto(texto: string, limite: number): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length > limite ? `${t.slice(0, limite - 1).trimEnd()}…` : t;
}

function DetalheDoServico({ servico }: { servico: ServicoDoRelatorio }) {
  const naoOk = servico.checklist.filter((c) => c.resultado === "nao_ok").length;
  return (
    // Serviços de tamanho normal ficam inteiros na mesma página; só os muito longos (checklist grande) podem quebrar.
    <View style={s.blocoServico} wrap={servico.checklist.length > 12}>
      <View style={s.topoServico} minPresenceAhead={70}>
        <Text style={s.topoTitulo}>
          {formatarData(servico.data)} · {servico.equipamento}
        </Text>
        <Text>{servico.tipoServico}</Text>
      </View>
      <View style={s.corpoServico}>
        <Text style={{ color: COR.suave }}>
          {servico.local} · {servico.tipoEquipamento}
        </Text>

        <View>
          <Text style={s.rotuloSecao}>O que foi feito</Text>
          <Text>{servico.descricao || "Sem descrição."}</Text>
        </View>

        {servico.checklist.length > 0 && (
          <View>
            <Text style={s.rotuloSecao}>
              Checklist{naoOk > 0 ? ` — ${naoOk} ${naoOk === 1 ? "item não está OK" : "itens não estão OK"}` : ""}
            </Text>
            {servico.checklist.map((c) => (
              <View key={c.key} style={s.itemChecklist} wrap={false}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text>{c.label}</Text>
                  {c.observacao ? <Text style={s.observacao}>Obs.: {c.observacao}</Text> : null}
                </View>
                <Text style={c.resultado === "nao_ok" ? [s.resultado, s.resultadoNaoOk] : s.resultado}>
                  {ROTULO_RESULTADO[c.resultado]}
                </Text>
              </View>
            ))}
          </View>
        )}

        {servico.fotos.length > 0 && (
          <View wrap={false}>
            <Text style={s.rotuloSecao}>Fotos</Text>
            <View style={s.fotos}>
              {servico.fotos.map((f, i) => (
                <View key={i} style={s.foto}>
                  <Image style={s.fotoImagem} src={{ data: f.imagem, format: "jpg" }} />
                  <Text style={s.fotoLegenda}>{f.momento === "antes" ? "Antes" : "Depois"}</Text>
                </View>
              ))}
            </View>
            {servico.fotosOmitidas > 0 && (
              <Text style={[s.observacao, { marginTop: 3 }]}>
                + {servico.fotosOmitidas} {servico.fotosOmitidas === 1 ? "foto" : "fotos"} no sistema (o relatório mostra até 4 por serviço).
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export function DocumentoRelatorio({ dados }: { dados: DadosRelatorio }) {
  const { resumo } = dados;
  return (
    <Document title={`Relatório de manutenções — ${dados.cliente.nome}`} author={dados.prestador} creator="Controle de Manutenções">
      <Page size="A4" style={s.pagina}>
        {/* Rodapé de todas as páginas */}
        <Text style={s.rodapeEsquerda} fixed>
          Relatório de manutenções · {dados.cliente.nome}
        </Text>
        <Text style={s.numeroPagina} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />

        {/* 1. Cabeçalho */}
        <Text style={s.titulo}>Relatório de manutenções</Text>
        <Text style={s.subtitulo}>Ar-condicionado, caixas d&apos;água, portas corta-fogo e luzes de emergência</Text>
        <View style={s.quadroDados}>
          <Dado rotulo="Prestador" valor={dados.prestador} />
          <Dado rotulo="Empresa" valor={dados.cliente.cnpj ? `${dados.cliente.nome} — CNPJ ${dados.cliente.cnpj}` : dados.cliente.nome} />
          <Dado rotulo="Período" valor={`${formatarData(dados.periodo.inicio)} a ${formatarData(dados.periodo.fim)}`} />
          <Dado rotulo="Data de emissão" valor={formatarData(dados.emissao)} />
          {dados.filtros.length > 0 && <Dado rotulo="Filtros" valor={dados.filtros.join(" · ")} />}
        </View>

        {/* 2. Resumo */}
        <Text style={s.h2}>Resumo</Text>
        <View style={s.indicadores}>
          <View style={s.indicador}>
            <Text style={s.indicadorNumero}>{resumo.totalServicos}</Text>
            <Text style={s.indicadorRotulo}>serviços no período</Text>
          </View>
          <View style={s.indicador}>
            <Text style={s.indicadorNumero}>{resumo.equipamentosAtendidos}</Text>
            <Text style={s.indicadorRotulo}>equipamentos atendidos</Text>
          </View>
          <View style={s.indicador}>
            <Text style={s.indicadorNumero}>{resumo.vencidas}</Text>
            <Text style={s.indicadorRotulo}>manutenções vencidas em {formatarData(dados.emissao)}</Text>
          </View>
        </View>
        <View style={s.colunasResumo} wrap={false}>
          <View style={s.colunaResumo}>
            <Text style={s.h3}>Por tipo de serviço</Text>
            {resumo.porTipoServico.length === 0 && <Text style={s.vazio}>Nenhum serviço no período.</Text>}
            {resumo.porTipoServico.map((r, i) => (
              <View key={r.rotulo} style={i % 2 === 1 ? [s.itemResumo, s.linhaPar] : s.itemResumo}>
                <Text>{r.rotulo}</Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{r.total}</Text>
              </View>
            ))}
          </View>
          <View style={s.colunaResumo}>
            <Text style={s.h3}>Por tipo de equipamento</Text>
            {resumo.porTipoEquipamento.length === 0 && <Text style={s.vazio}>Nenhum serviço no período.</Text>}
            {resumo.porTipoEquipamento.map((r, i) => (
              <View key={r.rotulo} style={i % 2 === 1 ? [s.itemResumo, s.linhaPar] : s.itemResumo}>
                <Text>{r.rotulo}</Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{r.total}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. Serviços realizados */}
        <Text style={s.h2}>Serviços realizados</Text>
        {dados.servicos.length === 0 ? (
          <Text style={s.vazio}>Nenhum serviço registrado neste período.</Text>
        ) : (
          <View>
            <View style={s.cabecalhoTabela}>
              <Text style={[s.celula, { width: "11%" }]}>Data</Text>
              <Text style={[s.celula, { width: "22%" }]}>Equipamento</Text>
              <Text style={[s.celula, { width: "17%" }]}>Local</Text>
              <Text style={[s.celula, { width: "13%" }]}>Serviço</Text>
              <Text style={[s.celula, { width: "37%" }]}>O que foi feito</Text>
            </View>
            {dados.servicos.map((sv, i) => (
              <View key={sv.id} style={i % 2 === 1 ? [s.linhaTabela, s.linhaPar] : s.linhaTabela} wrap={false}>
                <Text style={[s.celula, { width: "11%" }]}>{formatarData(sv.data)}</Text>
                <Text style={[s.celula, { width: "22%" }]}>{sv.equipamento}</Text>
                <Text style={[s.celula, { width: "17%" }]}>{sv.local}</Text>
                <Text style={[s.celula, { width: "13%" }]}>{sv.tipoServico}</Text>
                <Text style={[s.celula, { width: "37%" }]}>{curto(sv.descricao, 150) || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 4. Detalhe de cada serviço */}
        {dados.servicos.length > 0 && (
          <>
            <Text style={s.h2} minPresenceAhead={160}>
              Detalhe de cada serviço
            </Text>
            {dados.servicos.map((sv) => (
              <DetalheDoServico key={sv.id} servico={sv} />
            ))}
          </>
        )}

        {/* 5. Próximas manutenções */}
        <Text style={s.h2} minPresenceAhead={80}>
          Próximas manutenções
        </Text>
        {dados.proximas.length === 0 ? (
          <Text style={s.vazio}>Nenhuma manutenção agendada.</Text>
        ) : (
          <View>
            <View style={s.cabecalhoTabela}>
              <Text style={[s.celula, { width: "32%" }]}>Equipamento</Text>
              <Text style={[s.celula, { width: "26%" }]}>Local</Text>
              <Text style={[s.celula, { width: "20%" }]}>Serviço</Text>
              <Text style={[s.celula, { width: "22%" }]}>Data prevista</Text>
            </View>
            {dados.proximas.map((p, i) => (
              <View key={`${p.equipamento}-${i}`} style={i % 2 === 1 ? [s.linhaTabela, s.linhaPar] : s.linhaTabela} wrap={false}>
                <Text style={[s.celula, { width: "32%" }]}>{p.equipamento}</Text>
                <Text style={[s.celula, { width: "26%" }]}>{p.local}</Text>
                <Text style={[s.celula, { width: "20%" }]}>{p.servico}</Text>
                <Text style={[s.celula, { width: "22%" }, p.vencida ? { fontFamily: "Helvetica-Bold", color: COR.erroTexto } : {}]}>
                  {formatarData(p.dataPrevista)}
                  {p.vencida ? " (vencida)" : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 6. Assinaturas */}
        <View style={s.assinaturas} wrap={false}>
          <View style={s.assinatura}>
            <Text style={s.assinaturaNome}>{dados.prestador}</Text>
            <Text style={s.assinaturaPapel}>Prestador de serviço</Text>
          </View>
          <View style={s.assinatura}>
            <Text style={s.assinaturaNome}>{dados.cliente.nome}</Text>
            <Text style={s.assinaturaPapel}>Responsável da empresa</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
