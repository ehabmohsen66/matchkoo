import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Matchkoo — The First Esports & Gamification Network",
  description: "Matchkoo, the first esports & gamification network. Aims to bring together all sports fans and world-class gamers from across the globe in one place.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    type: "website",
    url: "https://matchkoo.com",
    title: "Matchkoo — The First Esports & Gamification Network",
    description: "Matchkoo, the first esports & gamification network. Aims to bring together all sports fans and world-class gamers from across the globe in one place.",
    siteName: "Matchkoo",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Matchkoo — The First Esports & Gamification Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Matchkoo — The First Esports & Gamification Network",
    description: "Matchkoo, the first esports & gamification network. Aims to bring together all sports fans and world-class gamers from across the globe in one place.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-body bg-bg-light">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P2GH3GGJ"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
      {/* Google Tag Manager */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-P2GH3GGJ');`,
        }}
      />
      {/* End Google Tag Manager */}
    </html>
  );
}
