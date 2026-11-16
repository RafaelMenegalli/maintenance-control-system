import { atualizarEstado } from "./estado";
import { aquecerCache } from "./aquecimento";
import { proximaTentativaDaFila, sincronizar } from "./motor";

/** De quanto em quanto tempo sincroniza com a aba visível. */
export const INTERVALO_MS = 5 * 60_000;

/**
 * Liga os gatilhos da sincronização (sem Background Sync — não existe no iPhone: só com o app aberto):
 * ao abrir, quando a internet volta (`online`), quando a aba volta para a frente e a cada 5 minutos com a
 * aba visível. Também reagenda a próxima tentativa de uma foto/serviço que falhou (espera crescente).
 * Devolve a função que desliga tudo.
 */
export function iniciarGatilhos(): () => void {
  let temporizadorEspera: ReturnType<typeof setTimeout> | undefined;
  let parado = false;

  const agendarEspera = async () => {
    clearTimeout(temporizadorEspera);
    const quando = await proximaTentativaDaFila().catch(() => null);
    if (parado || quando === null) return;
    temporizadorEspera = setTimeout(() => void rodar(false), Math.max(quando - Date.now(), 1000));
  };

  const rodar = async (forcar: boolean) => {
    if (parado) return;
    await sincronizar({ forcar });
    void agendarEspera();
  };

  const aoFicarOnline = () => {
    atualizarEstado({ semInternet: false });
    void rodar(false);
  };
  const aoFicarOffline = () => atualizarEstado({ semInternet: true });
  const aoVoltarParaFrente = () => {
    if (document.visibilityState === "visible") void rodar(false);
  };
  const aoTrocarServiceWorker = () => void aquecerCache();

  window.addEventListener("online", aoFicarOnline);
  window.addEventListener("offline", aoFicarOffline);
  document.addEventListener("visibilitychange", aoVoltarParaFrente);
  navigator.serviceWorker?.addEventListener("controllerchange", aoTrocarServiceWorker);
  const intervalo = setInterval(() => {
    if (document.visibilityState === "visible") void rodar(false);
  }, INTERVALO_MS);

  if (!navigator.onLine) atualizarEstado({ semInternet: true });
  void rodar(false); // ao abrir o app

  return () => {
    parado = true;
    clearInterval(intervalo);
    clearTimeout(temporizadorEspera);
    window.removeEventListener("online", aoFicarOnline);
    window.removeEventListener("offline", aoFicarOffline);
    document.removeEventListener("visibilitychange", aoVoltarParaFrente);
    navigator.serviceWorker?.removeEventListener("controllerchange", aoTrocarServiceWorker);
  };
}
