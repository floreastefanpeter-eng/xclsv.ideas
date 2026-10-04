import type { Metadata, Viewport } from "next";
import { Archivo, Atkinson_Hyperlegible } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

// Archivo cu axa de lățime: condensat pe plăcuțe, ca indicatoarele de metrou.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Punte — lecția accesibilă",
  description: "Elevul semnează. Clasa înțelege. Puntea dintre elevul surd și profesor, în timp real.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D1626",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={`${atkinson.variable} ${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
