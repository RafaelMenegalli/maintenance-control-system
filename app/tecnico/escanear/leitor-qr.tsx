"use client";

import { Scanner, setZXingModuleOverrides, type IDetectedBarcode, type IScannerError } from "@yudiel/react-qr-scanner";
import { ArrowLeft, CameraOff, QrCode, ScanLine, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { banco } from "@/lib/tecnico/data/banco";
import { extrairIdDoQr } from "@/lib/qr";

// O leitor usa um módulo WebAssembly (ZXing) para ler QR em navegadores sem leitor nativo (iPhone).
// Por padrão ele baixaria de um CDN; aqui vem do próprio app (public/zxing, no precache) para funcionar sem internet.
setZXingModuleOverrides({
  locateFile: (arquivo: string, prefixo: string) => (arquivo.endsWith(".wasm") ? `/zxing/${arquivo}` : prefixo + arquivo),
});

type Fase =
  | { tipo: "lendo" }
  /** Leu um QR, mas ele não é de equipamento deste sistema. */
  | { tipo: "invalido" }
  /** É um QR de equipamento, mas este celular não conhece o id (ex.: cadastrado agora, ainda sem sincronizar). */
  | { tipo: "desconhecido" }
  | { tipo: "camera"; erro: IScannerError };

const BUSCAR = "/tecnico/equipamentos";

/** Leitor de QR em tela cheia. Funciona offline: o equipamento é procurado no banco do celular. */
export default function LeitorQr() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ tipo: "lendo" });
  const lendo = useRef(false);

  async function aoLer(codigos: IDetectedBarcode[]) {
    if (lendo.current || codigos.length === 0) return;
    lendo.current = true;
    const id = extrairIdDoQr(codigos[0].rawValue);
    if (!id) {
      setFase({ tipo: "invalido" });
      return;
    }
    try {
      const equipamento = await banco().equipamentos.get(id);
      if (equipamento) {
        router.push(`/tecnico/equipamentos/${id}`);
        return;
      }
    } catch {
      /* sem banco local: cai em "desconhecido" */
    }
    setFase({ tipo: "desconhecido" });
  }

  function lerDeNovo() {
    lendo.current = false;
    setFase({ tipo: "lendo" });
  }

  const emFoco = fase.tipo === "lendo";
  const cameraNegada = fase.tipo === "camera" && fase.erro.kind === "permission-denied";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="flex items-center gap-3 p-3">
        <Button asChild variant="secondary" size="lg">
          <Link href="/tecnico">
            <ArrowLeft aria-hidden />
            Voltar
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Escanear QR Code</h1>
      </div>

      <div className="relative min-h-0 flex-1">
        {fase.tipo !== "camera" && (
          <Scanner
            onScan={aoLer}
            onError={(erro) => setFase({ tipo: "camera", erro })}
            paused={!emFoco}
            formats={["qr_code"]}
            constraints={{ facingMode: "environment" }}
            components={{ finder: true }}
            styles={{ container: { width: "100%", height: "100%" } }}
          />
        )}

        {emFoco && (
          <p className="pointer-events-none absolute inset-x-3 bottom-4 rounded-lg bg-black/75 p-3 text-center text-lg font-semibold">
            Aponte a câmera para a etiqueta do equipamento
          </p>
        )}

        {fase.tipo !== "lendo" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4">
            <div className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-background p-5 text-foreground">
              {fase.tipo === "camera" ? (
                <>
                  <span className="flex items-center gap-3 text-xl font-bold">
                    <CameraOff className="size-7" aria-hidden />
                    {cameraNegada ? "A câmera está bloqueada" : "Não consegui abrir a câmera"}
                  </span>
                  {cameraNegada ? (
                    <div className="flex flex-col gap-2 text-lg">
                      <p>Para ler a etiqueta, libere a câmera para este aplicativo:</p>
                      <ol className="list-decimal space-y-1 pl-6">
                        <li>Toque no cadeado (ou no ícone de configurações) ao lado do endereço do site.</li>
                        <li>
                          Em &quot;Câmera&quot;, escolha <strong>Permitir</strong>.
                        </li>
                        <li>Volte aqui e toque em &quot;Tentar de novo&quot;.</li>
                      </ol>
                      <p className="text-muted-foreground">No iPhone: Ajustes → Safari → Câmera → Permitir.</p>
                    </div>
                  ) : (
                    <p className="text-lg">
                      {fase.erro.kind === "no-camera"
                        ? "Este aparelho não tem câmera disponível."
                        : fase.erro.kind === "in-use"
                          ? "Outro aplicativo está usando a câmera. Feche-o e tente de novo."
                          : "Tente de novo. Se continuar, procure o equipamento pelo nome."}
                    </p>
                  )}
                  <Button size="lg" onClick={() => window.location.reload()}>
                    <ScanLine aria-hidden />
                    Tentar de novo
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-3 text-xl font-bold">
                    <QrCode className="size-7" aria-hidden />
                    {fase.tipo === "invalido" ? "Este QR Code não é de um equipamento" : "Equipamento não encontrado neste celular"}
                  </span>
                  <p className="text-lg">
                    {fase.tipo === "invalido"
                      ? "Use a etiqueta colada no equipamento, impressa por este sistema."
                      : "Ele pode ter sido cadastrado agora. Conecte-se à internet para atualizar os dados, ou procure pelo nome."}
                  </p>
                  <Button size="lg" onClick={lerDeNovo}>
                    <ScanLine aria-hidden />
                    Ler outro QR Code
                  </Button>
                </>
              )}
              <Button asChild size="lg" variant="outline">
                <Link href={BUSCAR}>
                  <Search aria-hidden />
                  Buscar pelo nome
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {emFoco && (
        <div className="p-3">
          <Button asChild size="lg" variant="secondary" className="w-full">
            <Link href={BUSCAR}>
              <Search aria-hidden />
              Buscar pelo nome
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
