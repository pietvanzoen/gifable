import type { User } from "@prisma/client";
import { json } from "@remix-run/node";
import { withZod } from "@remix-validated-form/with-zod";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import { changePassword } from "~/utils/session.server";
import FormInput from "./FormInput";
import SubmitButton from "./SubmitButton";

export const CHANGE_PASSWORD_INTENT = "change-password";

const validator = withZod(
  z.object({
    intent: z.literal(CHANGE_PASSWORD_INTENT),
    newPassword: z.string().min(4),
    confirmNewPassword: z.string().min(4),
  })
);

export async function changePasswordAction({
  userId,
  form,
}: {
  userId: User["id"];
  form: FormData;
}) {
  const result = await validator.validate(form);

  if (result.error) return validationError(result.error);

  const { newPassword, confirmNewPassword } = result.data;

  if (newPassword !== confirmNewPassword) {
    return validationError({
      fieldErrors: {
        newPassword: "Passwords do not match",
        confirmNewPassword: "Passwords do not match",
      },
    });
  }

  await changePassword({ userId, password: newPassword });

  return json({ success: true, intent: CHANGE_PASSWORD_INTENT });
}

export function ChangePasswordForm() {
  return (
    <ValidatedForm
      validator={validator}
      method="post"
      resetAfterSubmit={true}
      id="change-password"
    >
      <fieldset>
        <legend>
          <h3>Change Password</h3>
        </legend>
        <FormInput
          name="intent"
          type="hidden"
          value={CHANGE_PASSWORD_INTENT}
          required
        />
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
        <SubmitButton>Change Password</SubmitButton>
      </fieldset>
    </ValidatedForm>
  );
}
