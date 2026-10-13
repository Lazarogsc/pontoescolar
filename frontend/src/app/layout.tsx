import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ponto.escolar",
    template: "%s · ponto.escolar",
  },
  description: "Gestão escolar da pontodevelop: secretaria, matrículas, diretoria, portal do responsável e Meu RH.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
