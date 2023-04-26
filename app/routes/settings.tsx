import type { User } from "@prisma/client";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { notFound } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";
import { db } from "~/utils/db.server";
import crypto from "crypto";
import { changePassword, requireUserId } from "~/utils/session.server";
import { UserSchema } from "~/utils/validators";

export const changePasswordValidator = withZod(
  z.object({
    intent: z.enum(["change-password", "generate-api-token"]),
    username: UserSchema.shape.username,
    newPassword: z.string().min(4),
    confirmNewPassword: z.string().min(4),
  })
);

export async function action({ request }: ActionArgs) {
  const userId = await requireUserId(request);

  const form = await request.formData();

  const intent = form.get("intent");
  switch (intent) {
    case "change-password":
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

      return json({ success: true, intent });

    case "generate-api-token":
      await db.user.update({
        where: { id: userId },
        data: { apiToken: crypto.randomBytes(32).toString("hex") },
      });
      return redirect("/settings");

    default:
      throw notFound({ message: "Invalid intent" });
  }
}

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      lastLogin: true,
      isAdmin: true,
      apiToken: true,
    },
  });

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
          <FormInput
            name="intent"
            type="hidden"
            value="changePassword"
            required
          />
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

      <div>
        <legend>
          <h3>API Token</h3>
        </legend>
        <p>
          You can search your media via the endpoint <code>/api/media</code>.
          Pass your search query using the <code>search</code> query param.
        </p>

        {user?.apiToken ? (
          <details>
            <summary>Reveal Token</summary>
            <pre>
              <code>{user?.apiToken}</code>
            </pre>
            <button onClick={() => copyToClipboard(user?.apiToken)}>
              Copy token
            </button>
          </details>
        ) : (
          <div className="notice">
            You don't currently have a token. Click the button below to generate
            one.
          </div>
        )}

        <form method="post" style={{ display: "inline-block" }}>
          <button name="intent" type="submit" value="generate-api-token">
            Generate New Token
          </button>
        </form>
      </div>

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

function copyToClipboard(text: string | null) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    console.error(`navigator.clipboard.writeText is not supported.`, {
      text,
    });
  }
}
