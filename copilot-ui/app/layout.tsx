import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Support Copilot",
  description: "Agentic tech support copilot for customer service representatives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased" style={{ overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
