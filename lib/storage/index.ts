import { env } from "@/lib/env";
import { ArmazenamentoDisco, type Armazenamento } from "./disco";

export { chaveFoto, chaveMiniatura, type Armazenamento } from "./disco";

/** Armazenamento em uso (disco local, na pasta UPLOAD_DIR). Ver ./disco.ts. */
export const armazenamento: Armazenamento = new ArmazenamentoDisco(env.UPLOAD_DIR);
