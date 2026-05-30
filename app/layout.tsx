import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Echo — mój dziennik",
  description: "Twoje osobiste miejsce na refleksje",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full font-[family-name:var(--font-open-sans)]" style={{ background: "#07051A" }}>
        <div className="relative mx-auto min-h-screen max-w-[430px]" style={{ background: "#0F0C21" }}>
          <main className="pb-[72px]">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
