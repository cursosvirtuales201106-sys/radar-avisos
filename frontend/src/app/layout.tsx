import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chamba Local",
  description: "Avisos locales de empleo, servicios y alquileres"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}