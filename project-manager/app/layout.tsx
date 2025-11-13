import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GestionPro - Gestion de Projets",
  description: "Application de gestion de projets avec suivi d'avancement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
