import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NapGPT - The AI that just... doesn't feel like it right now",
  description: "A cozy, intentionally-lazy AI chatbot that would really rather be napping.",
  openGraph: {
    title: "NapGPT",
    description: "An AI that would really rather be napping. Drag the effort slider, spend coffee beans, watch it reluctantly respond.",
    type: "website",
    url: "https://napgpt.vercel.app",
  },
  twitter: {
    card: "summary",
    title: "NapGPT",
    description: "An AI that would really rather be napping.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

