import type { User } from "@prisma/client";

export function UserMangement({
  users,
}: {
  users: Pick<User, "id" | "username" | "lastLogin" | "isAdmin">[];
}) {
  return (
    <fieldset>
      <legend>
        <h3>Users</h3>
      </legend>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Username</th>
            <th>Last Login</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const { id, username, lastLogin, isAdmin } = user;
            return (
              <tr key={id}>
                <td>
                  {username} {isAdmin ? "(admin)" : null}
                </td>
                <td>
                  {lastLogin ? (
                    <time dateTime={lastLogin.toString()}>
                      {new Date(lastLogin).toLocaleString("en-GB", {
                        dateStyle: "long",
                        timeStyle: "long",
                      })}
                    </time>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );
}