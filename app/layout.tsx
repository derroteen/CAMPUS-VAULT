import type { Metadata } from "next";
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
  metadataBase: new URL("https://campus-vault-six.vercel.app"),
  title: "MVCorner | Maseno University Notes, Past Papers & Study Resources",
  description:
    "Download Maseno University notes, past papers, CATs and study guides. Upload notes or unlock unlimited downloads for 7 hours with MVCorner.",
  openGraph: {
    title: "MVCorner | Maseno University Notes, Past Papers & Study Resources",
    description:
      "Download Maseno University notes, past papers, CATs and study guides. Upload notes or unlock unlimited downloads for 7 hours with MVCorner.",
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
    title: "MVCorner | Maseno University Notes, Past Papers & Study Resources",
    description:
      "Download Maseno University notes, past papers, CATs and study guides.",
  },
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
