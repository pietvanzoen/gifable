import type { Tag } from "@prisma/client";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

const validator = withZod(
  z.object({
    name: z.string(),
  })
);

export async function action({ request }: LoaderArgs) {
  await requireUserId(request);
  const result = await validator.validate(await request.formData());

  if (result.error) return validationError(result.error, result.submittedData);

  await db.tag.create({
    data: {
      name: result.data.name,
    },
  });

  return json({ tags: await db.tag.findMany({}) });
}

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const tags = await db.tag.findMany({
    where: {},
  });

  return json({ tags });
}

export default function Tags() {
  const data = useLoaderData<typeof loader>();
  const actionData = useLoaderData<typeof action>();

  const tags: Tag[] = actionData?.tags ?? data.tags ?? [];

  return (
    <>
      <h1>Tags</h1>
      <details>
        <summary>Create a new tag</summary>
        <ValidatedForm
          validator={validator}
          method="post"
          noValidate={useHydrated()}
          defaultValue={actionData?.repopulateFields}
          resetAfterSubmit
        >
          <FormInput name="name" label="Name" required />
          <SubmitButton />
        </ValidatedForm>
      </details>

      <ul>
        {tags.map((tag) => (
          <li key={tag.id}>
            <a href={`/?tag=${tag.name}`}>{tag.name}</a>
          </li>
        ))}
      </ul>
    </>
  );
}
