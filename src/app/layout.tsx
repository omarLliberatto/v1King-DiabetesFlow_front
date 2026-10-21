import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Syne, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import ServiceWorker from "@/components/ServiceWorker";
import SyncManager from "@/components/SyncManager";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const space = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--nf-space" });
const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--nf-syne" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--nf-mono" });

export const metadata: Metadata = {
  title: "DiabetesFlow",
  description: "Calculadora de bolo y conteo de hidratos",
  appleWebApp: { capable: true, title: "DiabetesFlow", statusBarStyle: "black-translucent" },
  icons: {
    icon: `${basePath}/icon-192.png`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1A1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className={`${space.variable} ${syne.variable} ${inter.variable} ${mono.variable} min-h-full flex flex-col antialiased`}>
        <Header />
        <main className="flex-1 py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">{children}</div>
        </main>
        <ServiceWorker />
        <SyncManager />
      </body>
    </html>
  );
}
