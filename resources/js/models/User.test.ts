import { afterEach, describe, expect, it, vi } from "vitest";

import User from "./User";

/**
 * Regression: `editProfile` used to build `{ _method: "PUT", ...formData }`,
 * which spreads a FormData into nothing and sent only `_method` — the server
 * answered 200 "User updated successfully" while changing nothing.
 */
describe("User.editProfile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { axios?: unknown }).axios;
  });

  it("sends the profile fields and the PUT override as multipart data", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      data: {
        success: true,
        message: "User updated successfully",
        user: {
          id: 1,
          name: "Abdo Pr",
          login: "abdopr",
          image_url: null,
          roles: [],
          permissions: [],
        },
      },
    });

    (window as unknown as { axios: { request: typeof request } }).axios = { request };

    const form = new FormData();
    form.append("name", "Abdo Pr");

    const response = await User.editProfile(form);

    expect(response.success).toBe(true);
    expect(User.current?.name).toBe("Abdo Pr");

    const config = request.mock.calls[0][0];
    const sent = config.data as FormData;

    expect(sent).toBeInstanceOf(FormData);
    expect(sent.get("name")).toBe("Abdo Pr");
    expect(sent.get("_method")).toBe("PUT");
    expect(config.method).toBe("POST");
    expect(config.url).toBe("/auth/profile");

    // The browser must be allowed to set multipart/form-data with its boundary.
    expect(config.headers?.["Content-Type"]).toBeUndefined();
  });
});
