import { createBrowserRouter } from "react-router-dom";

import StoreLayout from "./components/StoreLayout";
import StorePage from "./components/StorePage";
import AppPage from "./components/AppPage";

/**
 * The store SPA is mounted at /store (Laravel serves the shell for every
 * /store/* path); react-router takes over from the basename.
 */
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <StoreLayout />,
      children: [
        { index: true, element: <StorePage /> },
        { path: "apps/:id", element: <AppPage /> },
      ],
    },
  ],
  { basename: "/store" },
);

export default router;
