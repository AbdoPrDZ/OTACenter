import { AxiosRequestConfig } from "axios";

export interface Response<T> {
  success: boolean;
  message: string;
  data?: T;
  errors: Record<string, string>;
  status: number;
  all?: any;
}

export interface RequestProps<T, D = any> extends AxiosRequestConfig<D> {
  dataField?: string;
  dataEncoding?: (data: Record<string, any>) => Promise<T>;
}
