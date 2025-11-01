import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import envServer from "~/utils/env.server";

/**
 * Matrix server discovery endpoint
 * Implements: https://spec.matrix.org/latest/server-server-api/#getwell-knownmatrixserver
 *
 * This endpoint tells Matrix clients and servers how to reach this Gifable instance
 * URL: /.well-known/matrix/server
 */
export async function loader({ request }: LoaderArgs) {
  // Extract the server name from APP_URL
  const appUrl = envServer.appUrl;
  const serverName = new URL(appUrl).hostname;

  return json(
    {
      "m.server": `${serverName}:443`,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}
