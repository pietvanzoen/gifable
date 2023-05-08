import type { User } from "@prisma/client";
import { json } from "@remix-run/node";
import { withZod } from "@remix-validated-form/with-zod";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import { db } from "~/utils/db.server";
import FormInput from "./FormInput";
import SubmitButton from "./SubmitButton";

export const SETTINGS_INTENT = "settings";

const validator = withZod(
  z.object({
    intent: z.literal(SETTINGS_INTENT),
    preferredLabels: z.string().trim().toLowerCase(),
  })
);

export async function settingsAction({
  userId,
  form,
}: {
  userId: User["id"];
  form: FormData;
}) {
  const settingsResult = await validator.validate(form);

  if (settingsResult.error) {
    return validationError(settingsResult.error);
  }

  const { preferredLabels } = settingsResult.data;

  await db.user.update({
    where: { id: userId },
    data: { preferredLabels },
  });

  return json({ success: true, intent: SETTINGS_INTENT });
}

type SettingsDefaultValues = {
  preferredLabels: string;
};

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: SettingsDefaultValues;
}) {
  return (
    <ValidatedForm
      validator={validator}
      method="post"
      defaultValues={defaultValues}
    >
      <fieldset>
        <legend>
          <h4>General</h4>
        </legend>
        <FormInput name="intent" type="hidden" value="settings" required />
        <FormInput
          name="preferredLabels"
          type="textarea"
          label="Preferred Labels"
          placeholder="e.g. 'yay, oh no, excited'"
          help="Comma separated list of labels to use for quick search."
        />
        <SubmitButton>Save</SubmitButton>
      </fieldset>
    </ValidatedForm>
  );
}
