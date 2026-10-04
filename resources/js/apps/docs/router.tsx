import { createBrowserRouter } from "react-router-dom";

import DocsLayout from "./components/DocsLayout";
import DocsPage from "./components/DocsPage";

/**
 * The docs SPA is mounted at /docs (Laravel serves the shell for every
 * /docs/* path); react-router takes over from the basename.
 */
const router = createBrowserRouter(
  [
    {
      path: "*",
      element: (
        <DocsLayout>
          <DocsPage />
        </DocsLayout>
      ),
    },
  ],
  { basename: "/docs" },
);

export default router;
