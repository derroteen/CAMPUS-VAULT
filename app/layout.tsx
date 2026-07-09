import type { Metadata } from "next";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://campus-vault-six.vercel.app"),
  title: "Campus Vault | Maseno University Notes, Past Papers & Study Resources",
  description:
    "Download Maseno University notes, past papers, CATs and study guides. Upload notes or unlock unlimited downloads for 7 hours with Campus Vault.",
  openGraph: {
    title: "Campus Vault | Maseno University Notes, Past Papers & Study Resources",
    description:
      "Download Maseno University notes, past papers, CATs and study guides. Upload notes or unlock unlimited downloads for 7 hours with Campus Vault.",
    url: "https://campus-vault-six.vercel.app",
    siteName: "Campus Vault",
    locale: "en_KE",
    type: "website",
    images: [{
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: "Campus Vault - Maseno University Study Resources",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Campus Vault | Maseno University Notes, Past Papers & Study Resources",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
