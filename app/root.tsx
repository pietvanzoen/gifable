import type { LinksFunction, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Link,
  Links,
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

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export async function loader({ request }: LoaderArgs) {
  return json({
    user: await getUser(request),
    buildSHA: env.buildSHA,
  });
}

function Document({
  children,
  title = `🦩 Gifable`,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const data = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>{title}</title>
        <Links />
      </head>
      <body>
        <header>
          <h1>🦩 Gifable</h1>

          {data?.user ? (
            <nav>
              <NavLink to="/">Search</NavLink>
              <NavLink to="/media/new">Add</NavLink>
              {data?.user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
              <Link to="/logout">Logout</Link>
            </nav>
          ) : null}
        </header>

        <main>{children}</main>

        <footer>
          <small>
            <div>
              Version:{" "}
              <a
                href={`https://github.com/pietvanzoen/gifable/tree/${
                  data?.buildSHA === "dev" ? "main" : data?.buildSHA
                }`}
              >
                {data?.buildSHA}
              </a>
            </div>

            <div>
              <a href="https://github.com/pietvanzoen/gifable/issues">Issues</a>
            </div>
          </small>
        </footer>

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
