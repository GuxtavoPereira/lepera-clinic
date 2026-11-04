"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
const KEY = "leperapia.theme";
const EVENT = "leperapia:theme";
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    const dark = event.newValue === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", storage);
  };
}
function snapshot() {
  return document.documentElement.classList.contains("dark");
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", !dark);
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* Mantem a escolha nesta janela. */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:focus-visible:outline-sidebar-primary"
    >
      {dark ? (
        <Sun aria-hidden="true" className="size-5" />
      ) : (
        <Moon aria-hidden="true" className="size-5" />
      )}
    </button>
  );
}
