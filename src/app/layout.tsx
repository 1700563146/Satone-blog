import type { Metadata } from "next";

import { siteConfig, RSS_PATH } from "@/lib/config";

import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  // RSS 自动发现；canonical 由各页面分别声明，避免被父级继承成"/"
  alternates: {
    types: { "application/rss+xml": RSS_PATH },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={siteConfig.locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
