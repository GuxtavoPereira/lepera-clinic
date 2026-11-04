import React from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background dark:[--primary:var(--sidebar-primary)] dark:[--primary-foreground:var(--background)]">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )}
