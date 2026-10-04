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
  EyeOff,
  Search,
  Settings2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  empty?: React.ReactNode;
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
  empty,
  actions,
  onRowClick,
  requestKey,
  className,
}: ModelDataTableProps<MT>) {
  const columnDefs = columns && columns.length > 0 ? columns : model.getDataTableColumns?.();

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
              onCheckedChange={(value) => {
                table.toggleAllPageRowsSelected(!!value);
              }}
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
        })
      );
    }

    columnDefs?.forEach((column) => {
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
              <span>{String(info.getValue() ?? "")}</span>
            ),
        })
      );
    });

    if (actions) {
      defs.push(
        helper.display({
          id: "actions",
          enableHiding: false,
          enableSorting: false,
          cell: ({ row }) => actions(row.original),
        })
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

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {(enableSearch || enableColumnVisibility) && (
        <div className="flex w-full items-center justify-between gap-2">
          {enableSearch && (
            <div className="relative max-w-sm flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-7"
              />
            </div>
          )}
          {enableColumnVisibility && <DataTableViewOptions table={table} />}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 5) }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24">
                  {empty ?? (
                    <Empty>
                      <EmptyContent>
                        <EmptyTitle>{emptyMessage}</EmptyTitle>
                        <EmptyDescription>
                          Try adjusting your search or add some data to get started.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" />}
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <ArrowDown />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp />
        ) : (
          <ArrowUpDown />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowUp />
          Asc
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowDown />
          Desc
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
          <EyeOff />
          Hide
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface DataTableViewOptionsProps<MT extends RowData> {
  table: ReactTable<DataTableFeatures, MT>;
}

function DataTableViewOptions<MT extends RowData>({ table }: DataTableViewOptionsProps<MT>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
            <Settings2 />
            View
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {itemsCount.toLocaleString()} row{itemsCount === 1 ? "" : "s"}
      </div>

      <div className="flex items-center space-x-4 lg:space-x-6">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-7 rounded-md border border-input bg-input/20 px-1 text-xs outline-none"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {Math.min(pageIndex + 1, pagesCount)} of {Math.max(pagesCount, 1)}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-7 lg:flex"
            onClick={() => onPageIndexChange(0)}
            disabled={pageIndex === 0}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => onPageIndexChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => onPageIndexChange(pageIndex + 1)}
            disabled={pageIndex + 1 >= pagesCount}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-7 lg:flex"
            onClick={() => onPageIndexChange(pagesCount - 1)}
            disabled={pageIndex + 1 >= pagesCount}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}