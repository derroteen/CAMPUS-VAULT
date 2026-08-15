import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.campusvault.top"),
  title: "MVCorner | Maseno University Study Resources & Campus Marketplace",
  description:
    "Download Maseno University notes, past papers, and study guides. Buy and sell with the campus community on the MVCorner marketplace.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MVCorner",
  },
  openGraph: {
    title: "MVCorner | Maseno University Study Resources & Campus Marketplace",
    description:
      "Download Maseno University notes, past papers, and study guides. Buy and sell with the campus community on the MVCorner marketplace.",
    url: "https://campus-vault-six.vercel.app",
    siteName: "MVCorner",
    locale: "en_KE",
    type: "website",
    images: [{
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: "MVCorner - Maseno University Study Resources",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MVCorner | Maseno University Study Resources & Campus Marketplace",
    description:
      "Download Maseno University notes, past papers, and study guides. Buy and sell with the campus community on the MVCorner marketplace.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B4332",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
