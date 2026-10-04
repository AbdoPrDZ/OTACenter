import * as React from "react";
import {
  Column,
  ColumnDef,
  ColumnVisibilityState,
  ReactTable,
  RowData,
  RowSelectionState,
  SortingState,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  Search,
  Settings2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/form";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import {
  Dropdown,
  DropdownCheckboxItem,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";

import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";
import { Response } from "@/types/http";

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

export type DataTableFeatures = typeof features;

export interface ModelStatic<MT extends IModel> {
  all(props?: FetchAllProps): Promise<Response<ItemsResponse<MT>>>;
  getDataTableColumns?: () => DataTableColumn<MT>[];
}

export interface ModelDataTableProps<MT extends IModel> {
  model: ModelStatic<MT>;
  url?: string;
  columns?: DataTableColumn<MT>[];
  pageSize?: number;
  pageSizeOptions?: number[];
  enableSearch?: boolean;
  enableSorting?: boolean;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  actions?: (row: MT) => React.ReactNode;
  onRowClick?: (row: MT) => void;
  requestKey?: string | number;
  className?: string;
}

function useDebounce<T>(value: T, delay = 800): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default function ModelDataTable<MT extends IModel>({
  model,
  url,
  columns,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  enableSearch = true,
  enableSorting = true,
  enableColumnVisibility = true,
  enableRowSelection = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  actions,
  onRowClick,
  requestKey,
  className,
}: ModelDataTableProps<MT>) {
  const columnDefs = React.useMemo(
    () =>
      columns && columns.length > 0
        ? columns
        : model.getDataTableColumns?.() ?? [],
    [columns, model],
  );

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<MT[]>([]);
  const [itemsCount, setItemsCount] = React.useState(0);
  const [pagesCount, setPagesCount] = React.useState(0);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSizeState] = React.useState(initialPageSize);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const lastSearchRef = React.useRef(debouncedSearch);
  const skipNextFetchRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchItems() {
      if (skipNextFetchRef.current) {
        skipNextFetchRef.current = false;
        return;
      }

      const searchChanged = lastSearchRef.current !== debouncedSearch;
      lastSearchRef.current = debouncedSearch;

      const fetchPageIndex = searchChanged ? 0 : pageIndex;

      if (searchChanged && pageIndex !== 0) {
        skipNextFetchRef.current = true;
        setPageIndex(0);
      }

      setLoading(true);

      const response = await model.all({
        url,
        pagination: { page: fetchPageIndex + 1, pageSize },
        sort: sorting.map((s) => ({ field: s.id, sort: s.desc ? "desc" : "asc" })),
        filter: debouncedSearch ? { quickFilterValues: [debouncedSearch] } : undefined,
      });

      if (cancelled) return;

      if (response.success && response.data) {
        setItems(response.data.items);
        setItemsCount(response.data.itemsCount);
        setPagesCount(response.data.pagesCount);

        if (response.data.page !== fetchPageIndex + 1) {
          setPageIndex(Math.max(response.data.page - 1, 0));
        }
      }

      setLoading(false);
    }

    fetchItems();

    return () => {
      cancelled = true;
    };
  }, [model, url, pageIndex, pageSize, debouncedSearch, sorting, requestKey]);

  const helper = React.useMemo(() => createColumnHelper<DataTableFeatures, MT>(), []);

  const columnsDef = React.useMemo(() => {
    const defs: ColumnDef<DataTableFeatures, MT>[] = [];

    if (enableRowSelection) {
      defs.push(
        helper.display({
          id: "select",
          enableHiding: false,
          enableSorting: false,
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={
                table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          ),
        }),
      );
    }

    columnDefs.forEach((column) => {
      const field = String(column.field);

      defs.push(
        helper.accessor((row: MT) => (row as Record<string, unknown>)[field], {
          id: field,
          header: ({ column: col }) => (
            <DataTableColumnHeader
              title={column.headerName}
              column={col}
              sortingEnabled={enableSorting}
            />
          ),
          cell: (info) =>
            column.renderCell ? (
              column.renderCell({ row: info.row.original })
            ) : (
              <span className="text-foreground/90">{String(info.getValue() ?? "")}</span>
            ),
        }),
      );
    });

    if (actions) {
      defs.push(
        helper.display({
          id: "actions",
          enableHiding: false,
          enableSorting: false,
          cell: ({ row }) => actions(row.original),
        }),
      );
    }

    return defs;
  }, [helper, columnDefs, enableSorting, enableRowSelection, actions]);

  const table = useTable({
    features,
    data: items,
    columns: columnsDef,
    state: {
      pagination: { pageIndex, pageSize },
      sorting,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: (updaterOrValue) => {
      const next = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue;
      setSorting(next);
      setPageIndex(0);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updaterOrValue) => {
      const next =
        typeof updaterOrValue === "function" ? updaterOrValue({ pageIndex, pageSize }) : updaterOrValue;
      setPageIndex(next.pageIndex);
      setPageSizeState(next.pageSize);
    },
    onRowSelectionChange: setRowSelection,
    manualSorting: true,
    manualPagination: true,
    rowCount: itemsCount,
    pageCount: pagesCount,
  });

  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const showSkeleton = loading && items.length === 0;
  const refreshing = loading && items.length > 0;

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {(enableSearch || enableColumnVisibility) && (
        <div className="flex w-full items-center justify-between gap-2">
          {enableSearch && (
            <div className="relative w-full max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          )}
          {enableColumnVisibility && <DataTableViewOptions table={table} />}
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {refreshing ? (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/15">
            <div className="h-full w-1/4 animate-progress rounded-full bg-primary" />
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-10 px-3 text-left align-middle text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              className={cn(
                "transition-opacity duration-150",
                refreshing && "opacity-60",
              )}
            >
              {showSkeleton ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-border/60 last:border-0">
                    {visibleColumns.map((column) => (
                      <td key={column.id} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-full max-w-40" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "border-b border-border/60 transition-colors last:border-0",
                      "hover:bg-accent/40 data-[state=selected]:bg-primary/5",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 align-middle">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-2">
                    <EmptyState
                      className="border-0"
                      icon={Inbox}
                      title={emptyMessage}
                      description="Try adjusting your search, or add some data to get started."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DataTablePagination
        itemsCount={itemsCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pagesCount={pagesCount}
        pageSizeOptions={pageSizeOptions}
        onPageIndexChange={setPageIndex}
        onPageSizeChange={setPageSizeState}
      />
    </div>
  );
}

interface DataTableColumnHeaderProps<MT extends IModel, TV> {
  column: Column<DataTableFeatures, MT, TV>;
  title: string;
  sortingEnabled?: boolean;
}

function DataTableColumnHeader<MT extends IModel, TV>({
  column,
  title,
  sortingEnabled,
}: DataTableColumnHeaderProps<MT, TV>) {
  if (!sortingEnabled || !column.getCanSort()) {
    return <span>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <Dropdown
      align="start"
      trigger={
        <button
          type="button"
          className="-ml-2 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:bg-accent hover:text-foreground"
        >
          {title}
          {sorted === "desc" ? (
            <ArrowDown className="size-3" />
          ) : sorted === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowUpDown className="size-3 opacity-50" />
          )}
        </button>
      }
    >
      <DropdownItem onClick={() => column.toggleSorting(false)}>
        <ArrowUp /> Ascending
      </DropdownItem>
      <DropdownItem onClick={() => column.toggleSorting(true)}>
        <ArrowDown /> Descending
      </DropdownItem>
    </Dropdown>
  );
}

interface DataTableViewOptionsProps<MT extends RowData> {
  table: ReactTable<DataTableFeatures, MT>;
}

function DataTableViewOptions<MT extends RowData>({ table }: DataTableViewOptionsProps<MT>) {
  return (
    <Dropdown
      align="end"
      trigger={
        <Button variant="outline" size="sm">
          <Settings2 /> View
        </Button>
      }
    >
      <DropdownLabel>Toggle columns</DropdownLabel>
      <DropdownSeparator />
      {table
        .getAllColumns()
        .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
        .map((column) => (
          <DropdownCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onClick={() => column.toggleVisibility(!column.getIsVisible())}
          >
            {column.id}
          </DropdownCheckboxItem>
        ))}
    </Dropdown>
  );
}

interface DataTablePaginationProps {
  itemsCount: number;
  pageIndex: number;
  pageSize: number;
  pagesCount: number;
  pageSizeOptions: number[];
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
}

function DataTablePagination({
  itemsCount,
  pageIndex,
  pageSize,
  pagesCount,
  pageSizeOptions,
  onPageIndexChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs text-muted-foreground">
        {itemsCount.toLocaleString()} row{itemsCount === 1 ? "" : "s"}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Rows
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-md border border-input bg-input/30 px-2 text-xs outline-none focus-visible:border-ring"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <span className="text-xs font-medium tabular-nums">
          Page {Math.min(pageIndex + 1, Math.max(pagesCount, 1))} of {Math.max(pagesCount, 1)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageIndexChange(0)}
            disabled={pageIndex === 0}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageIndexChange(pageIndex - 1)}
            disabled={pageIndex === 0}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageIndexChange(pageIndex + 1)}
            disabled={pageIndex + 1 >= pagesCount}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageIndexChange(pagesCount - 1)}
            disabled={pageIndex + 1 >= pagesCount}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
