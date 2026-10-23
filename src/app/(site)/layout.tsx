import type { ReactNode } from "react";

import { Navbar } from "@/components/navigation/navbar";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-(--page-width) flex-1 flex-col px-4 sm:px-6">
      <header className="sticky top-0 z-10 py-4">
        <Navbar />
      </header>
      <main className="flex flex-1 flex-col pb-16">{children}</main>
    </div>
  );
}
