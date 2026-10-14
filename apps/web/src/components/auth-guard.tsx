"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HOME_BY_ROLE, canAccess } from "@/config/access";
import { useRole } from "@/lib/use-role";

const subscribeNoop = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useRole();
  const hydrated = useHydrated();

  const allowed = role !== null && canAccess(role, pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!role) {
      router.replace("/auth/login");
    } else if (!canAccess(role, pathname)) {
      router.replace(HOME_BY_ROLE[role]);
    }
  }, [hydrated, role, pathname, router]);

  if (!hydrated || !allowed) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-sm text-slate-500">
        Carregando...
      </div>
    );
  }

  return <>{children}</>;
}
