import "../../css/app.css";

import axios from "axios";

declare global {
  interface Window {
    axios: typeof axios;
  }
}

window.axios = axios;
window.axios.defaults.baseURL = (import.meta.env.VITE_APP_URL || "") + "/api";
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
window.axios.defaults.headers.common["Accept"] = "application/json";
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;
window.axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 419) {
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

const csrfToken = (
  document.head.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
)?.content;

if (csrfToken) window.axios.defaults.headers.common["X-CSRF-TOKEN"] = csrfToken;

export function selectFile(
  contentType: string,
  multiple = false
): Promise<File[] | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    input.accept = contentType;
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : undefined;
      resolve(files);
    };
    input.onabort = () => resolve(undefined);
    input.oncancel = () => resolve(undefined);

    input.click();
  });
}

export async function pickImage(
  multiple: boolean = false
): Promise<File | undefined> {
  const files = await selectFile("image/png, image/jpeg, image/gif", multiple);

  return files?.[0];
}

export async function pickImages(): Promise<File[] | undefined> {
  return selectFile("image/png, image/jpeg, image/gif", true);
}
