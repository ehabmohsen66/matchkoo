import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

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
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
