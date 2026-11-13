import Request from "@/utils/http";

/** A one-time code that links a device to a user (demo releases). */
export interface IDeviceLinkCode {
  id: number;
  user_id: number;
  app_id: number | null;
  /** Plain code, returned once at creation. */
  code: string;
  expires_at: string;
  created_at: string;
}

export interface ILinkedDevice {
  id: number;
  did: string;
  manufacturer: string | null;
  brand: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export default class DeviceLink {
  /** A code for another user (`device.link`). */
  static async createForUser(userId: number, data: { app_id?: number | null; expires_in_minutes?: number } = {}) {
    return Request.post<IDeviceLinkCode>({ url: `/user/${userId}/device-link-code`, data, dataField: "item" });
  }

  /** A code for the signed-in user. */
  static async createForSelf(data: { app_id?: number | null; expires_in_minutes?: number } = {}) {
    return Request.post<IDeviceLinkCode>({ url: "/auth/device-link-code", data, dataField: "item" });
  }

  static async devices(userId: number) {
    return Request.get<ILinkedDevice[]>({ url: `/user/${userId}/device`, dataField: "items" });
  }

  static async unlink(deviceId: number) {
    return Request.delete({ url: `/device/${deviceId}/link` });
  }
}
