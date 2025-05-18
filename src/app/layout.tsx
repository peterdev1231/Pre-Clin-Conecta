import type { Metadata } from "next";
import { Inter, Lora, Montserrat } from "next/font/google";
import "./globals.css";
// import "../styles/nprogress.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
// import { TopProgressBar } from "@/components/layout/TopProgressBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: 'swap',
  weight: ['400', '500', '600', '700']
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: 'swap',
  weight: ['300', '400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: "Painel Médico - Pré-Consulta",
  description: "Gerenciamento de pré-consultas médicas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${lora.variable} ${montserrat.variable} font-montserrat`}>
      <body>
        <AuthProvider>
          {/* <TopProgressBar /> */}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
