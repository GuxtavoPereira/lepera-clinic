import React from "react";
import Sidebar from "@/components/sidebar";
import { Header } from "@/components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <Header />

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
