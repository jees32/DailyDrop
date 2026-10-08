import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";

import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import Providers from "@/context/providers";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DailyDrop | Hyperlocal Marketplace",
  description:
    "Discover nearby stores and get groceries delivered in 30 mins to 1 hour.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden bg-gray-50 text-gray-900">
        <Providers>
          <AppShell>
            <div className="flex  min-h-full flex-1 flex-col">{children}</div>
          </AppShell>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
