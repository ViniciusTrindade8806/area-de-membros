import type { Metadata } from "next";
import { Barlow_Condensed, Inter_Tight } from "next/font/google";
import "./globals.css";
const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans" });
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: "italic",
  variable: "--font-display",
});
export const metadata: Metadata = {
  title: "Sua jornada | E-Drive GO",
  description:
    "Conhecimento para ir mais longe. A jornada de desenvolvimento dos motoristas E-Drive GO.",
  icons: { icon: "/brand/icon.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
