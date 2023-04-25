import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { getUser, requireUserId } from "~/utils/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const user = await getUser(request);
  if (!user?.isAdmin) {
    return redirect("/");
  }

  return json({
    user,
    users: await db.user.findMany({
      select: {
        id: true,
        username: true,
        lastLogin: true,
        isAdmin: true,
      },
    }),
  });
}

export default function AdminRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Admin</h1>

      <h2>Users</h2>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Username</th>
            <th>Last Login</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((user) => (
            <tr key={user.id}>
              <td>
                {user.username} {user.isAdmin ? "(admin)" : null}
              </td>
              <td>{user.lastLogin?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
