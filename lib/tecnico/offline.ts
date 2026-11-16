/**
 * Quais telas do técnico funcionam sem internet (a lista de rotas permitidas do service worker, em
 * app/sw.ts, tem de bater com esta) e quais URLs o app "aquece" no cache depois de sincronizar.
 */
export const ROTAS_FIXAS_OFFLINE = [
  "/tecnico",
  "/tecnico/equipamentos",
  "/tecnico/escanear",
  "/tecnico/servicos/novo",
  "/tecnico/instalar",
] as const;

/** URLs a guardar para os equipamentos informados (detalhe + registro de serviço). */
export function urlsParaAquecer(idsEquipamentos: string[]): string[] {
  return [
    ...ROTAS_FIXAS_OFFLINE,
    ...idsEquipamentos.flatMap((id) => [`/tecnico/equipamentos/${id}`, `/tecnico/equipamentos/${id}/novo-servico`]),
  ];
}
