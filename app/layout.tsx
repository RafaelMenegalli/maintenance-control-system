import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Controle de Manutenções",
    template: "%s · Controle de Manutenções",
  },
  description:
    "Registro e comprovação de manutenções de ar-condicionado, caixas d'água, portas corta-fogo e luzes de emergência.",
  applicationName: "Controle de Manutenções",
  // iPhone: ao adicionar à Tela de Início o app abre em tela cheia, com este ícone.
  appleWebApp: { capable: true, title: "Manutenções", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004a9c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
