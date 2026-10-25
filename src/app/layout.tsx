import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StyleScout",
  description: "Clothing picks that learn your taste",
  appleWebApp: { capable: true, title: "StyleScout", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`}>
      <body className="min-h-dvh">
        <ToastProvider>
          <Nav />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
