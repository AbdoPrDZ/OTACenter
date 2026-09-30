import { Field } from "@/types/field";
import { decodeField } from "./fields";
import { FetchAllProps, IModel, ItemsResponse } from "@/types/model";
import Request from "./http";


export class Model<MT extends IModel> {
  protected static modelName: string;
  protected static endpoint: string;

  constructor(protected data: MT) { }

  getAttr<K extends keyof MT>(key: K): MT[K] {
    return this.data[key];
  }

  setAttr<K extends keyof MT>(key: K, value: MT[K]): void {
    this.data[key] = value;
  }

  setAttrs(attrs: Partial<MT>): void {
    for (const key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        this.setAttr(key as keyof MT, attrs[key as keyof MT]!);
      }
    }
  }

  toJSON() {
    return this.data;
  }

  public static createProxy<MT extends IModel>(item: Model<MT>): Model<MT> & MT {
    return new Proxy(item as Model<MT> & MT, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        return target.getAttr(prop as keyof MT);
      },

      set(target, prop, value, receiver) {
        if (prop in target) {
          return Reflect.set(target, prop, value, receiver);
        }

        target.setAttr(prop as keyof MT, value);
        return true;
      },
    });
  }
}

export function createModel<MT extends IModel>(
  modelName: string,
  fields: (Field<any> & { name: keyof MT })[],
  postWithMultipart: boolean = false,
) {
  return class ModelClass extends Model<MT> {
    static override modelName = modelName;
    static override endpoint = `/${modelName}`;

    constructor(public override data: MT) {
      super(data);
    }

    static async decode(data: any): Promise<MT> {
      const record: Partial<MT> = {};

      for (const fieldConf of fields) {
        record[fieldConf.name] = await decodeField<any>(fieldConf, data);
      }

      return record as MT;
    }

    static async all(props?: FetchAllProps) {
      const { pagination, sort, filter, url } = props || {};

      const requestUrl = url || this.endpoint;

      if (!requestUrl) throw new Error("URL or endpoint not found");
      return Request.get<ItemsResponse<MT>>({
        url: requestUrl,
        dataEncoding: async (data) => ({
          // items: await Promise.all(data.items.map(this.decode.bind(this))),
          items: await Promise.all(data.items.map(async (raw: any) => await this.decode(raw))),
          itemsCount: data.itemsCount,
          pagesCount: data.pagesCount,
          page: data.page,
        }),
        params: {
          page: pagination ? pagination?.page : null,
          pageSize: pagination?.pageSize,
          search: filter?.quickFilterValues?.[0],
          sort: {
            ...sort?.reduce((acc, e) => ({ ...acc, [e.field]: e.sort }), {}),
          },
          filter: {
            ...filter?.items?.reduce(
              (acc, e) => ({
                ...acc,
                [e.field]: e.value,
              }),
              {}
            ),
          },
        },
      });
    }

    static async create(data: Partial<MT> | FormData, multiPart: boolean = postWithMultipart) {
      if (!this.endpoint) throw new Error("Endpoint not found");

      if (data instanceof FormData) data.append("_method", "POST");
      else data = { _method: "POST", ...data };

      return Request.post({
        url: this.endpoint,
        data: data,
        dataField: "item",
        // dataEncoding: this.decode.bind(this),
        dataEncoding: async (data) => await this.decode(data),
        headers: multiPart
          ? {
              ...window.axios.defaults.headers.common,
              "Content-Type": "multipart/form-data",
            }
          : {},
      });
    }

    static async find(id: number) {
      return Request.get({
        url: `${this.endpoint}/${id}`,
        dataField: "item",
        // dataEncoding: this.decode.bind(this),
        dataEncoding: async (data) => await this.decode(data),
      });
    }

    static async update(id: number, data: Partial<MT> | FormData, multiPart: boolean = postWithMultipart) {
      if (!this.endpoint) throw new Error("Endpoint not found");

      if (data instanceof FormData) data.append("_method", "PUT");
      else data = { _method: "PUT", ...data };

      return Request.post({
        url: `${this.endpoint}/${id}`,
        data: data,
        dataField: "item",
        // dataEncoding: this.decode.bind(this),
        dataEncoding: async (data) => await this.decode(data),
        headers: multiPart
          ? {
              ...window.axios.defaults.headers.common,
              "Content-Type": "multipart/form-data",
            }
          : {},
      });
    }

    static async delete(id: number) {
      if (!this.endpoint) throw new Error("Endpoint not found");

      return Request.delete({ url: `${this.endpoint}/${id}` });
    }

    async save() {
      if (this.data.id) return (this.constructor as typeof ModelClass).update(this.data.id, this.data, postWithMultipart);
      else return (this.constructor as typeof ModelClass).create(this.data, postWithMultipart);
    }

    async remove() {
      return (this.constructor as typeof ModelClass).delete(this.data.id);
    }
  }
}
