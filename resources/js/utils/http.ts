import { RequestProps, Response } from "@/types/http";
import { AxiosError, AxiosResponse } from "axios";

function logTimestamp(): string {
  const now = new Date();
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");

  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`
  );
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
    success: success,
    message: message,
    data: success ? (dataEncoding ? await dataEncoding(data) : data) : undefined,
    errors: errors,
    status: response.status,
    all: response.data,
  };
}

export default class Request {
  static async send<T = any>({
    dataField,
    dataEncoding,
    ...props
  }: RequestProps<T>): Promise<Response<T>> {
    const startedAt = performance.now();
    const label = `${props.method ?? "?"} ${props.url ?? "?"}`;

    try {
      console.log(`[${logTimestamp()}] REQUEST  ${label}`, props);
      const response = await window.axios.request(props);
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.log(
        `[${logTimestamp()}] RESPONSE ${label} (${elapsedMs}ms, status ${response.status})`,
        response.data
      );
      return await encodeRequestResponse(response, dataField, dataEncoding);
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.error(
        `[${logTimestamp()}] ERROR    ${label} (${elapsedMs}ms)`,
        error
      );
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

  static async get<T = any>({
    dataField,
    dataEncoding,
    ...rest
  }: RequestProps<T>): Promise<Response<T>> {
    const props = { ...rest, method: "GET" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async post<T = any>({
    dataField,
    dataEncoding,
    ...rest
  }: RequestProps<T>): Promise<Response<T>> {
    const props = { ...rest, method: "POST" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async put<T = any>({
    dataField,
    dataEncoding,
    ...rest
  }: RequestProps<T>): Promise<Response<T>> {
    const props = { ...rest, method: "PUT" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async patch<T = any>({
    dataField,
    dataEncoding,
    ...rest
  }: RequestProps<T>): Promise<Response<T>> {
    const props = { ...rest, method: "PATCH" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async delete<T = any>({
    dataField,
    dataEncoding,
    ...rest
  }: RequestProps<T>): Promise<Response<T>> {
    const props = { ...rest, method: "DELETE" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }

  static async head<T = any>({
    dataField,
    dataEncoding,
    ...rest
  }: RequestProps<T>): Promise<Response<T>> {
    const props = { ...rest, method: "HEAD" };
    return await Request.send({ dataField, dataEncoding, ...props });
  }
}
