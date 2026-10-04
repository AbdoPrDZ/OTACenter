import { Route } from "@/types/router";
import { ReactNode } from "react";
import {
  DataRouter,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";

export default class Router {
  static routes: Route[] = [];

  static _current: Route = { path: "" };

  static get current() {
    this._current = this.getCurrent();

    return this._current;
  }

  get current() {
    return (this.constructor as typeof Router).current;
  }

  static get(
    name: string,
    params?: Record<string, string>,
    th: boolean = true
  ) {
    let route = this.routes.find((route) => route.name === name);

    if (!route && th) throw new Error(`Route ${name} not found`);

    if (params && route) route = { ...route, params };

    return route;
  }

  static getPath(
    name: string,
    params?: Record<string, string>,
    th: boolean = true
  ) {
    const route = this.get(name, params, th);

    if (!route) return undefined;

    return this.parseRoutePath(route);
  }

  static getByPath(path: string, th: boolean = true) {
    const route = this.routes.find((route) => {
      const routeParts = route.path.split("/");
      const pathParts = path.split("/");
      if (routeParts.length !== pathParts.length) return false;
      return routeParts.every(
        (part, index) => part.startsWith(":") || part === pathParts[index]
      );
    });

    if (!route && th) throw new Error(`Route for path ${path} not found`);

    return route;
  }

  static getRoutes(): ReactNode {
    throw new Error("Not implemented");
  }

  private static onNavigate(from: Route, to: Route): void {
    this._current = to;

    document.title = to.title ? `Stock Manager - ${to.title}` : "Stock Manager";

    this._listeners.forEach((listener) => listener(from, to));
  }

  private static _listeners: ((from: Route, to: Route) => void)[] = [];

  static listen(listener: (from: Route, to: Route) => void) {
    this._listeners.push(listener);
  }

  listen(listener: (from: Route, to: Route) => void) {
    (this.constructor as typeof Router).listen(listener);
  }

  private static getCurrent(): Route {
    const currentRoute = this.getByPath(window.location.pathname, false);

    if (!currentRoute) return { name: "", path: window.location.pathname };

    const routeParts = currentRoute.path.split("/");
    const pathParts = window.location.pathname.split("/");

    const params = routeParts.reduce((params, part, index) => {
      if (part.startsWith(":")) params[part.substring(1)] = pathParts[index];

      return params;
    }, {} as Record<string, string>);

    // Copy: `routes` is the shared route table, mutating it would bake the
    // current params into every later `getPath()` / `getRoutes()` result.
    return { ...currentRoute, params };
  }

  private static _router?: DataRouter;

  static load(): DataRouter {
    if (this._router) return this._router;

    const browserRouter = createBrowserRouter(
      createRoutesFromElements(this.getRoutes())
    );

    browserRouter.subscribe(() => {
      const to = this.getCurrent();

      this.onNavigate(this._current, to);
    });

    this._router = browserRouter;

    const current = this.getCurrent();

    this.onNavigate(current, current);

    return browserRouter;
  }

  load(): DataRouter {
    return (this.constructor as typeof Router).load();
  }

  static parseRoutePath(route: Route) {
    let path = route.path;
    if (route.params)
      Object.keys(route.params).forEach((key) => {
        path = path!.replace(`:${key}`, route.params![key]);
      });

    return path;
  }
}
