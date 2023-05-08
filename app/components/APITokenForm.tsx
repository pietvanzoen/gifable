import { json } from "@remix-run/node";
import { withZod } from "@remix-validated-form/with-zod";
import { ValidatedForm } from "remix-validated-form";
import { z } from "zod";
import { db } from "~/utils/db.server";
import { copyToClipboard } from "~/utils/helpers.client";
import FormInput from "./FormInput";
import SubmitButton from "./SubmitButton";
import { useToast } from "./Toast";
import crypto from "crypto";

export const API_TOKEN_INTENT = "generate-api-token";

const validator = withZod(
  z.object({
    intent: z.literal(API_TOKEN_INTENT),
  })
);

export async function apiTokenAction({ userId }: { userId: string }) {
  const apiToken = crypto.randomBytes(24).toString("hex");
  await db.user.update({
    where: { id: userId },
    data: { apiToken },
  });

  return json({ success: true, intent: API_TOKEN_INTENT, apiToken });
}

export function APITokenForm({ apiToken }: { apiToken?: string }) {
  const toast = useToast();

  return (
    <fieldset>
      <legend>
        <h3>API Token</h3>
      </legend>
      <p>
        You can search your media via the endpoint <code>/api/media</code>. Pass
        your search query using the <code>search</code> query param.
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
        validator={validator}
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
  );
}
