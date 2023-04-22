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
} from '@remix-run/react';
import type { LinksFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';

import stylesUrl from '~/styles/global.css';
import { getUser } from './utils/session.server';

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: stylesUrl }];
};

export async function loader({ request }: LoaderArgs) {
  return json({
    user: await getUser(request),
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
              <Link to="/logout">Logout</Link>
            </nav>
          ) : null}
        </header>

        <main>{children}</main>

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
