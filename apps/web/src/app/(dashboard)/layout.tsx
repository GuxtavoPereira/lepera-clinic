import React from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-dvh w-full overflow-hidden bg-slate-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />

          <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
