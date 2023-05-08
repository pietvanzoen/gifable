import type { User } from "@prisma/client";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { notFound } from "remix-utils";
import { ValidatedForm } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";
import { db } from "~/utils/db.server";
import crypto from "crypto";
import { requireUserId } from "~/utils/session.server";
import { makeTitle } from "~/utils/meta";
import { useEffect } from "react";
import { useToast } from "~/components/Toast";
import { copyToClipboard } from "~/utils/helpers.client";
import {
  settingsAction,
  SettingsForm,
  SETTINGS_INTENT,
} from "~/components/SettingsForm";
import {
  changePasswordAction,
  ChangePasswordForm,
  CHANGE_PASSWORD_INTENT,
} from "~/components/ChangePasswordForm";

export const apiTokenValidator = withZod(
  z.object({
    intent: z.literal("generate-api-token"),
  })
);

export function meta() {
  return [{ title: makeTitle(["Settings"]) }];
}

export async function action({ request }: ActionArgs) {
  const userId = await requireUserId(request);

  const form = await request.formData();

  const intent = form.get("intent");

  switch (intent) {
    case CHANGE_PASSWORD_INTENT:
      return changePasswordAction({ userId, form });

    case "generate-api-token":
      const apiToken = crypto.randomBytes(24).toString("hex");
      await db.user.update({
        where: { id: userId },
        data: { apiToken },
      });

      return json({ success: true, intent, apiToken });

    case SETTINGS_INTENT:
      return settingsAction({ userId, form });

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
      preferredLabels: true,
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
  const toast = useToast();

  const apiToken = actionData?.apiToken || data.user?.apiToken;

  useEffect(() => {
    switch (actionData?.intent) {
      case "change-password":
        toast("Password changed");
        break;

      case SETTINGS_INTENT:
        toast("Settings updated");
        break;

      case "generate-api-token":
        toast("API token updated");
        break;

      default:
        break;
    }
  }, [actionData]);

  const { user, users } = data;
  return (
    <div>
      <h1>Settings</h1>

      <SettingsForm
        defaultValues={{
          preferredLabels: user?.preferredLabels || "",
        }}
      />

      <ChangePasswordForm
        defaultValues={{
          username: "",
        }}
      />

      <fieldset>
        <legend>
          <h4>API Token</h4>
        </legend>
        <p>
          You can search your media via the endpoint <code>/api/media</code>.
          Pass your search query using the <code>search</code> query param.
        </p>

        {apiToken ? (
          <details>
            <summary>Reveal Token</summary>
            <pre>
              <code>{apiToken}</code>
            </pre>
            <button
              onClick={() =>
                copyToClipboard(apiToken, () => toast("Copied token"))
              }
            >
              Copy token
            </button>
          </details>
        ) : (
          <div className="notice">
            You don't currently have a token. Click the button below to generate
            one.
          </div>
        )}

        <ValidatedForm
          id="generate-api-token"
          validator={apiTokenValidator}
          method="post"
          style={{ display: "inline-block" }}
        >
          <FormInput
            name="intent"
            type="hidden"
            value="generate-api-token"
            required
          />
          {apiToken ? (
            <p>⚠️ Generating a new API token will invalidate your old token.</p>
          ) : null}
          <SubmitButton>Generate new token</SubmitButton>
        </ValidatedForm>
      </fieldset>

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
