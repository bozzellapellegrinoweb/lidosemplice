import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "LidoFacile.it — Il gestionale semplice per il tuo stabilimento",
    template: "%s | LidoFacile.it",
  },
  description:
    "Gestisci prenotazioni, ombrelloni e pagamenti del tuo stabilimento balneare in modo semplice e intuitivo. Zero commissioni, tutto incluso.",
  keywords: [
    "gestionale stabilimento balneare",
    "prenotazione ombrelloni",
    "stabilimento balneare",
    "software stabilimento balneare",
    "prenotazione lettini",
    "gestione lido",
  ],
  authors: [{ name: "LidoFacile.it" }],
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "LidoFacile.it",
    title: "LidoFacile.it — Il gestionale semplice per il tuo stabilimento",
    description:
      "Gestisci prenotazioni, ombrelloni e pagamenti del tuo stabilimento balneare. Zero commissioni.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00BFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              fontSize: "1rem",
            },
          }}
        />
      </body>
    </html>
  );
}
