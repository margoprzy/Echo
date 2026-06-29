import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import PostHogProvider from "@/components/PostHogProvider";

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
      <body className="min-h-full font-[family-name:var(--font-open-sans)]" style={{ background: "#020617" }}>
        <PostHogProvider>
        <AuthProvider>
          {/* Desktop: sidebar + content | Mobile: centered card */}
          <div className="md:flex md:min-h-screen">
            <Sidebar />
            <div className="flex-1 md:flex md:justify-center md:items-start">
              <div
                className="relative w-full mx-auto min-h-screen max-w-[430px] md:max-w-2xl"
                style={{
                  background:
                    "radial-gradient(140% 95% at 50% -10%, rgba(139,92,246,0.38) 0%, rgba(124,58,237,0.18) 38%, rgba(46,16,101,0) 70%), linear-gradient(180deg, #2e1065 0%, #1e1b4b 50%, #020617 100%)",
                }}
              >
                <main className="pt-[calc(env(safe-area-inset-top,0px)_+_56px)] md:pt-0 pb-6 md:pb-10">
                  {children}
                </main>
                <MobileNav />
              </div>
            </div>
          </div>
        </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
