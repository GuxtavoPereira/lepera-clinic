"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  CircleAlert,
  Package,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName } from "@/components/forms/form-field";
import { DashboardHeader, StatCard } from "@/components/dashboard/stat-card";
import { useRole } from "@/lib/use-role";
import { InventoryItemSheet } from "./inventory-item-sheet";
import {
  StockMovementSheet,
  type StockSheetMode,
} from "./stock-movement-sheet";
import {
  stockStatus,
  type InventoryItem,
  type InventoryPage,
  type InventorySummary,
} from "./inventory-types";
import { useInventoryResource } from "./use-inventory-resource";

export function InventoryWorkspace() {
  const role = useRole();
  const enabled = role === "ADMIN" || role === "SUPER_ADMIN";
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [filter, setFilter] = useState({ search: "", lowStock: false });
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [edit, setEdit] = useState<{ item: InventoryItem | null } | null>(null);
  const [view, setView] = useState<{
    item: InventoryItem;
    mode: StockSheetMode;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "15",
    search: filter.search,
    lowStock: String(filter.lowStock),
  });
  const list = useInventoryResource<InventoryPage<InventoryItem>>(
    `/inventory/items?${params}`,
    revision,
    enabled,
  );
  const summary = useInventoryResource<InventorySummary>(
    "/inventory/summary",
    revision,
    enabled,
  );

  function refresh() {
    setRevision((n) => n + 1);
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilter({ search: search.trim(), lowStock });
  }
  function afterMove(item: InventoryItem) {
    setView(null);
    setPage(1);
    refresh();
    setNotice(
      `Movimentação registrada. ${item.name}: ${item.stockQuantity} unidades em estoque.`,
    );
  }
  function afterSave(item: InventoryItem) {
    const created = edit?.item === null;
    setEdit(null);
    setPage(1);
    refresh();
    setNotice(
      created
        ? `Material “${item.name}” cadastrado. Registre a entrada das unidades para atualizar o saldo.`
        : `Material “${item.name}” atualizado.`,
    );
    if (created) setView({ item, mode: "ENTRY" });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardHeader
          title="Materiais e estoque"
          subtitle="Controle reposições, consumo e os materiais que precisam de atenção."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11"
            type="button"
            variant="outline"
            disabled={list.loading || summary.loading}
            onClick={refresh}
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Atualizar
          </Button>
          <Button
            className="min-h-11"
            type="button"
            onClick={() => {
              setNotice(null);
              setEdit({ item: null });
            }}
          >
            <Plus className="size-4" aria-hidden="true" /> Novo material
          </Button>
        </div>
      </div>
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground"
        >
          {notice}
        </p>
      ) : null}
      {summary.error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive"
        >
          Não foi possível carregar os indicadores: {summary.error} Use
          “Atualizar” para tentar novamente.
        </p>
      ) : null}
      <section aria-label="Resumo geral do estoque" className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Os indicadores consideram todos os materiais cadastrados.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Materiais cadastrados"
            value={summary.data?.totalItems ?? "—"}
            icon={Package}
          />
          <StatCard
            label="Precisam de reposição"
            value={summary.data?.lowStockItems ?? "—"}
            hint="Saldo igual ou abaixo do mínimo"
            icon={CircleAlert}
            tone="warning"
          />
          <StatCard
            label="Sem estoque"
            value={summary.data?.outOfStockItems ?? "—"}
            hint="Incluídos nos itens para repor"
            icon={Boxes}
            tone="warning"
          />
          <StatCard
            label="Unidades em estoque"
            value={summary.data?.totalUnits ?? "—"}
            hint="Soma das unidades de todos os materiais"
            icon={Package}
          />
        </div>
      </section>
      <form
        onSubmit={apply}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4"
      >
        <div className="min-w-48 flex-1">
          <FormField id="inventory-search" label="Buscar material">
            <input
              id="inventory-search"
              className={inputClassName}
              value={search}
              maxLength={120}
              placeholder="Nome ou descrição"
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => setLowStock(e.target.checked)}
            className="size-4 accent-primary"
          />
          Somente materiais para repor
        </label>
        <Button className="min-h-11" type="submit" variant="outline">
          Aplicar filtros
        </Button>
        {filter.search || filter.lowStock ? (
          <Button
            className="min-h-11"
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setLowStock(false);
              setFilter({ search: "", lowStock: false });
              setPage(1);
            }}
          >
            Limpar
          </Button>
        ) : null}
      </form>
      {list.error ? (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-destructive/40 p-4 text-sm text-destructive"
        >
          <p>{list.error}</p>
          <Button
            className="min-h-11"
            variant="outline"
            type="button"
            onClick={refresh}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {list.loading ? (
        <p
          role="status"
          className="rounded-xl border border-border p-5 text-sm text-muted-foreground"
        >
          Carregando materiais…
        </p>
      ) : null}
      {list.data ? (
        <section aria-label="Lista de materiais" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {list.data.total}{" "}
            {list.data.total === 1
              ? "material encontrado"
              : "materiais encontrados"}
          </p>
          {list.data.items.length === 0 ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Package
                className="mx-auto size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-medium">Nenhum material encontrado</p>
              <p className="text-sm text-muted-foreground">
                {filter.search || filter.lowStock
                  ? "Ajuste os filtros ou cadastre um novo material."
                  : "Cadastre um material e registre a primeira entrada para começar."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.data.items.map((item) => {
                const needsStock = item.stockQuantity <= item.minimumStock;
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground xl:flex-row xl:items-center xl:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="break-words font-semibold">
                          {item.name}
                        </h2>
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${needsStock ? "bg-amber-500/15 text-amber-800 dark:text-amber-200" : "bg-teal-500/10 text-teal-800 dark:text-teal-200"}`}
                        >
                          {stockStatus(item)}
                        </span>
                      </div>
                      {item.description ? (
                        <p className="break-words text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                      <p className="text-sm">
                        <strong>{item.stockQuantity}</strong> unidades
                        disponíveis{" "}
                        <span className="text-muted-foreground">
                          · mínimo {item.minimumStock}
                        </span>
                      </p>
                    </div>
                    <div
                      className="flex shrink-0 flex-wrap gap-2"
                      aria-label={`Ações de ${item.name}`}
                    >
                      <Button
                        className="min-h-11"
                        type="button"
                        variant="outline"
                        onClick={() => setView({ item, mode: "ENTRY" })}
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />{" "}
                        Entrada
                      </Button>
                      <Button
                        className="min-h-11"
                        type="button"
                        variant="outline"
                        disabled={item.stockQuantity === 0}
                        onClick={() => setView({ item, mode: "EXIT" })}
                      >
                        <ArrowUp className="size-4" aria-hidden="true" /> Saída
                      </Button>
                      <Button
                        className="min-h-11"
                        type="button"
                        variant="outline"
                        onClick={() => setView({ item, mode: "history" })}
                      >
                        Histórico
                      </Button>
                      <Button
                        className="min-h-11"
                        type="button"
                        variant="ghost"
                        onClick={() => setEdit({ item })}
                      >
                        Editar
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {list.data.totalPages > 1 ? (
            <nav
              aria-label="Páginas de materiais"
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span>
                Página {list.data.page} de {list.data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  className="min-h-11"
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Anterior
                </Button>
                <Button
                  className="min-h-11"
                  type="button"
                  variant="outline"
                  disabled={page >= list.data.totalPages}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Próxima
                </Button>
              </div>
            </nav>
          ) : null}
        </section>
      ) : null}
      {edit ? (
        <InventoryItemSheet
          key={edit.item?.id ?? "new"}
          initial={edit.item}
          onClose={() => setEdit(null)}
          onSaved={afterSave}
        />
      ) : null}
      {view ? (
        <StockMovementSheet
          key={view.item.id}
          item={view.item}
          initialMode={view.mode}
          onClose={() => setView(null)}
          onSaved={afterMove}
        />
      ) : null}
    </div>
  );
}
