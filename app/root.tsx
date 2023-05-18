import type { LinksFunction, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Link,
  LiveReload,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import stylesUrl from "~/styles/global.css";
import { getUser } from "./utils/session.server";
import env from "~/utils/env.server";
import { ToastContainer } from "./components/Toast";
import type { Theme } from "./components/ThemeStyles";
import Head from "./components/Head";
import NavigationLoader from "./components/NavigationLoader";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export async function loader({ request }: LoaderArgs) {
  return json({
    user: await getUser(request),
    buildSHA: env.buildSHA,
  });
}

function Document({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <Head theme={data?.user?.theme as Theme} />
      <body>
        <header id="top">
          <a href="#main" className="skip-to-content">
            Skip to content
          </a>
          <h1>
            <Link className="title-link" to="/">
              Gifable
            </Link>
          </h1>

          {data?.user ? (
            <nav>
              <NavLink prefetch="intent" to="/">
                Search
              </NavLink>
              <NavLink prefetch="intent" to="/media/new">
                Add
              </NavLink>
              <NavLink prefetch="intent" to="/settings">
                Settings
              </NavLink>
              <Link to="/logout">Logout</Link>
            </nav>
          ) : null}
        </header>

        <main id="main">{children}</main>

        <footer>
          <small>
            <p>
              Version:{" "}
              <a
                href={`https://github.com/pietvanzoen/gifable/tree/${
                  data?.buildSHA === "dev" ? "main" : data?.buildSHA
                }`}
              >
                {data?.buildSHA}
              </a>
            </p>

            <div>
              <a
                href="https://github.com/pietvanzoen/gifable"
                aria-label="Github"
                title="Gifable on Github"
                className="icon-link"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                >
                  <path d="M16 0.396c-8.84 0-16 7.164-16 16 0 7.071 4.584 13.067 10.94 15.18 0.8 0.151 1.093-0.344 1.093-0.769 0-0.38-0.013-1.387-0.020-2.72-4.451 0.965-5.389-2.147-5.389-2.147-0.728-1.847-1.78-2.34-1.78-2.34-1.449-0.992 0.112-0.972 0.112-0.972 1.607 0.112 2.451 1.648 2.451 1.648 1.427 2.447 3.745 1.74 4.66 1.331 0.144-1.035 0.556-1.74 1.013-2.14-3.553-0.4-7.288-1.776-7.288-7.907 0-1.747 0.62-3.173 1.647-4.293-0.18-0.404-0.72-2.031 0.14-4.235 0 0 1.34-0.429 4.4 1.64 1.28-0.356 2.64-0.532 4-0.54 1.36 0.008 2.72 0.184 4 0.54 3.040-2.069 4.38-1.64 4.38-1.64 0.86 2.204 0.32 3.831 0.16 4.235 1.020 1.12 1.64 2.547 1.64 4.293 0 6.147-3.74 7.5-7.3 7.893 0.56 0.48 1.080 1.461 1.080 2.96 0 2.141-0.020 3.861-0.020 4.381 0 0.42 0.28 0.92 1.1 0.76 6.401-2.099 10.981-8.099 10.981-15.159 0-8.836-7.164-16-16-16z"></path>
                </svg>
              </a>
            </div>
          </small>
        </footer>

        <NavigationLoader />
        <ToastContainer />
        <Scripts />
        <ScrollRestoration />
        <LiveReload />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Document>
      <Outlet />
    </Document>
  );
}

export function ErrorBoundary() {
  let error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <Document title={`${error.status} ${error.statusText}`}>
        <div className="notice">
          <h1>
            {error.status} {error.statusText}
          </h1>
          <p>{error.data}</p>
        </div>
      </Document>
    );
  } else if (error instanceof Error) {
    return (
      <Document title="Uh-oh!">
        <div className="notice">
          <h1>Error</h1>
          <p>{error.message}</p>
          <p>The stack trace is:</p>
          <pre>{error.stack}</pre>
        </div>
      </Document>
    );
  } else {
    return (
      <Document title="Uh-oh!">
        <h1>Unknown Error</h1>
        <p>Something went wrong.</p>
      </Document>
    );
  }
}
