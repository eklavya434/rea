import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Website X-Ray | AI-Assisted Architecture & Feature Analysis",
  description:
    "Observe website interface behavior, investigate software internals via REA MCP, and generate high-fidelity feature specifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 text-slate-100 antialiased flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-surface-800 bg-surface-950 py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Website X-Ray &copy; {new Date().getFullYear()} &mdash; Authorized Developer Audit Tool</span>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="hover:text-slate-200">SSRF Hardened</span>
              <span>&bull;</span>
              <span className="hover:text-slate-200">Playwright Isolated</span>
              <span>&bull;</span>
              <span className="hover:text-slate-200">REA MCP Ready</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
