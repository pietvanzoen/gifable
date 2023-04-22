import type { LoaderArgs } from "@remix-run/node";

import { logout } from "~/utils/session.server";

export const loader = async ({ request }: LoaderArgs) => {
  return logout(request);
};
