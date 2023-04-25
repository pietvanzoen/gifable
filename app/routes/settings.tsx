import type { User } from "@prisma/client";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";
import { db } from "~/utils/db.server";
import {
  changePassword,
  checkPassword,
  getUser,
  requireUserId,
} from "~/utils/session.server";
import { UserSchema } from "~/utils/validators";

export const changePasswordValidator = withZod(
  z.object({
    username: UserSchema.shape.username,
    newPassword: z.string().min(4),
    confirmNewPassword: z.string().min(4),
  })
);

export async function action({ request }: ActionArgs) {
  await requireUserId(request);

  const form = await request.formData();
  const result = await changePasswordValidator.validate(form);

  if (result.error) return validationError(result.error);

  const { username, newPassword, confirmNewPassword } = result.data;

  if (newPassword !== confirmNewPassword) {
    return validationError({
      fieldErrors: {
        newPassword: "Passwords do not match",
        confirmNewPassword: "Passwords do not match",
      },
    });
  }

  await changePassword({ username, password: newPassword });

  return json({ success: true });
}

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const user = await getUser(request);
  return json({
    user,
    users: user?.isAdmin
      ? await db.user.findMany({
          select: {
            id: true,
            username: true,
            lastLogin: true,
            isAdmin: true,
          },
        })
      : null,
  });
}

export default function AdminRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const { user, users } = data;
  return (
    <div>
      <h1>Settings</h1>

      <ValidatedForm
        validator={changePasswordValidator}
        method="post"
        resetAfterSubmit={true}
      >
        <fieldset>
          <legend>
            <h3>Change Password</h3>
          </legend>
          <FormInput name="username" type="hidden" value={user?.username} />
          <FormInput
            name="newPassword"
            type="password"
            label="New Password"
            required
          />
          <FormInput
            name="confirmNewPassword"
            type="password"
            label="Confirm New Password"
            required
          />
          {actionData?.success ? (
            <p style={{ color: "green" }}>Password changed successfully</p>
          ) : null}
          <SubmitButton>Change Password</SubmitButton>
        </fieldset>
      </ValidatedForm>

      {user?.isAdmin && users ? <Users users={users as User[]} /> : null}
    </div>
  );
}

function Users({
  users,
}: {
  users: Pick<User, "id" | "username" | "lastLogin" | "isAdmin">[];
}) {
  return (
    <section>
      <h2>Users</h2>

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
    </section>
  );
}
