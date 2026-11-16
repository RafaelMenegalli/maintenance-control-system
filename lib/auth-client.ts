"use client";

import { createAuthClient } from "better-auth/react";

/** Cliente do Better Auth (só login e logout; não existe cadastro público). */
export const authClient = createAuthClient();
