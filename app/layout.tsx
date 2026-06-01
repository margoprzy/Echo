import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

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
        {/* Desktop: sidebar + content | Mobile: centered card */}
        <div className="md:flex md:min-h-screen">
          <Sidebar />
          <div className="flex-1 md:flex md:justify-center md:items-start">
            <div
              className="relative w-full mx-auto min-h-screen max-w-[430px] md:max-w-2xl"
              style={{
                background:
                  "radial-gradient(125% 55% at 50% -8%, rgba(124,92,191,0.45) 0%, rgba(124,92,191,0.12) 32%, rgba(15,12,33,0) 60%), linear-gradient(180deg, #18122E 0%, #0F0C21 40%)",
              }}
            >
              <main className="pb-[72px] md:pb-10">{children}</main>
              <BottomNav />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
