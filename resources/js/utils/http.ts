import { RequestProps, Response } from "@/types/http";
import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

/** Request logging only runs in development (or when VITE_APP_DEBUG=true). */
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_APP_DEBUG === "true";

function logTimestamp(): string {
  const now = new Date();
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");

  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`
  );
}

/** Deterministic key for coalescing identical requests (sorts object keys). */
function stableKey(value: unknown): string {
  if (value == null) return "";

  try {
    return JSON.stringify(value, (_key, item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return Object.keys(item)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (item as Record<string, unknown>)[key];
            return acc;
          }, {});
      }
      return item;
    });
  } catch {
    return String(value);
  }
}

async function encodeRequestResponse<T>(
  response: AxiosResponse,
  dataField?: string,
  dataEncoding?: (data: any) => Promise<T>
): Promise<Response<T>> {
  const {
    success = response.status < 400,
    message = response.statusText,
    errors = {},
    ...rest
  } = response.data;

  const data = dataField ? response.data[dataField] : rest;

  return {
    success,
    message,
    data: success ? (dataEncoding ? await dataEncoding(data) : data) : undefined,
    errors,
    status: response.status,
    all: response.data,
  };
}

export default class Request {
  /**
   * In-flight identical GET/HEAD requests, keyed by method + url + params.
   * Collapses duplicate calls (e.g. React StrictMode double-invoked effects
   * in development) into a single network request. Cleared once settled, so it
   * never serves stale data.
   */
  private static inflight = new Map<string, Promise<Response<unknown>>>();

  static async send<T = any>({
    dataField,
    dataEncoding,
    ...props
  }: RequestProps<T>): Promise<Response<T>> {
    const method = (props.method ?? "GET").toUpperCase();
    const coalescable = method === "GET" || method === "HEAD";

    if (coalescable) {
      const key = `${method} ${props.url ?? ""} ${stableKey(props.params)}`;
      const existing = Request.inflight.get(key);
      if (existing) return existing as Promise<Response<T>>;

      const promise = Request.run<T>(props, dataField, dataEncoding);
      Request.inflight.set(key, promise);
      promise
        .finally(() => {
          if (Request.inflight.get(key) === promise) Request.inflight.delete(key);
        })
        .catch(() => undefined);

      return promise;
    }

    return Request.run<T>(props, dataField, dataEncoding);
  }

  private static async run<T>(
    props: AxiosRequestConfig,
    dataField?: string,
    dataEncoding?: (data: any) => Promise<T>
  ): Promise<Response<T>> {
    const startedAt = performance.now();
    const label = `${props.method ?? "?"} ${props.url ?? "?"}`;

    try {
      const response = await window.axios.request(props);

      if (DEBUG) {
        const elapsedMs = Math.round(performance.now() - startedAt);
        console.log(`[${logTimestamp()}] ${response.status} ${label} (${elapsedMs}ms)`);
      }

      return await encodeRequestResponse(response, dataField, dataEncoding);
    } catch (error) {
      if (DEBUG) {
        const elapsedMs = Math.round(performance.now() - startedAt);
        console.error(`[${logTimestamp()}] ERROR    ${label} (${elapsedMs}ms)`, error);
      }

      if (error instanceof AxiosError) {
        return {
          success: false,
          message: error.response?.data.message ?? error.message,
          errors: error.response?.data.errors ?? {},
          status: 500,
          all: error.response?.data,
        };
      }

      throw error;
    }
  }

  static async get<T = any>({ dataField, dataEncoding, ...rest }: RequestProps<T>) {
    const props = { ...rest, method: "GET" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async post<T = any>({ dataField, dataEncoding, ...rest }: RequestProps<T>) {
    const props = { ...rest, method: "POST" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async put<T = any>({ dataField, dataEncoding, ...rest }: RequestProps<T>) {
    const props = { ...rest, method: "PUT" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async patch<T = any>({ dataField, dataEncoding, ...rest }: RequestProps<T>) {
    const props = { ...rest, method: "PATCH" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async delete<T = any>({ dataField, dataEncoding, ...rest }: RequestProps<T>) {
    const props = { ...rest, method: "DELETE" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async head<T = any>({ dataField, dataEncoding, ...rest }: RequestProps<T>) {
    const props = { ...rest, method: "HEAD" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }
}
