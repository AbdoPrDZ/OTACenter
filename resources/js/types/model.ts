import { Field } from './field';

export interface IModel {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface LazyValue<T> {
  id: number;
  field: Field<T>;
  fetch: () => Promise<T>;
}

export interface PaginationProps {
  pageSize?: number;
  page?: number;
};

export interface SortItem {
  field: string;
  sort: 'asc' | 'desc' | null | undefined;
}
export type SortModel = readonly SortItem[];

export interface FilterItem {
  id?: number | string;
  field: string;
  value?: any;
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=';
}

export interface FilterModel {
  items: FilterItem[];
  logicOperator?: 'and' | 'or';
  quickFilterValues?: any[];
  quickFilterLogicOperator?: 'and' | 'or';
  quickFilterExcludeHiddenColumns?: boolean;
}

export interface FetchAllProps {
  pagination?: PaginationProps;
  sort?: SortModel;
  filter?: Partial<FilterModel>;
  url?: string;
}

export interface ItemsResponse<T> {
  items: T[];
  itemsCount: number;
  pagesCount: number;
  page: number;
}

export interface DataTableColumn<T> {
  field: keyof T | string;
  headerName: string;
  flex?: number;
  minWidth?: number;
  maxWidth?: number;
  renderCell?: (params: { row: T }) => React.ReactNode;
}
