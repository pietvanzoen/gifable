import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { storeURL, getImageData, storeBuffer } from "~/utils/media.server";
import bytes from "bytes";
import { useState } from "react";

const commonFields = z.object({
  filename: z.string().regex(/^[a-z0-9-_]+\.(gif|jpg|png)$/),
  comment: z.string().optional(),
  altText: z.string().optional(),
});

const fileFields = commonFields.extend({
  uploadType: z.literal("file"),
  file: z.any(),
});

const urlFields = commonFields.extend({
  uploadType: z.literal("url"),
  url: z.string().url(),
});

const validator = withZod(
  z.discriminatedUnion("uploadType", [fileFields, urlFields])
);

export async function action({ request }: ActionArgs) {
  const formData = await unstable_parseMultipartFormData(
    request,
    unstable_createMemoryUploadHandler({
      maxPartSize: bytes("10mb"),
      filter: (file) => {
        if (file.name !== "file") return true;
        return file.contentType?.startsWith("image/");
      },
    })
  );

  const userId = await requireUserId(request);

  const result = await validator.validate(formData);
  if (result.error) return validationError(result.error, result.submittedData);

  const { comment, uploadType, filename } = result.data;

  const mediaUrl =
    uploadType === "url"
      ? await storeURL(result.data.url, filename)
      : await storeBuffer(
          Buffer.from(await result.data.file.arrayBuffer()),
          filename
        );

  const { thumbnail, ...imageData } = await getImageData(mediaUrl);

  const thumbnailFilename = `${filename.split(".")[0]}-thumbnail.jpg`;

  let thumbnailUrl: string | null = null;
  if (thumbnail) {
    thumbnailUrl = await storeBuffer(thumbnail, thumbnailFilename);
  }

  const media = await db.media.create({
    data: {
      url: mediaUrl,
      thumbnailUrl,
      comment,
      ...imageData,
      userId,
    },
  });

  return redirect(`/media/${media.id}`);
}

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  return json({});
}

export default function NewMediaRoute() {
  const actionData = useActionData<typeof action>();
  const [uploadType, setUploadType] = useState<"url" | "file">("url");

  return (
    <ValidatedForm
      validator={validator}
      defaultValues={actionData?.repopulateFields}
      method="post"
      noValidate={useHydrated()}
      encType="multipart/form-data"
    >
      <fieldset>
        <legend>
          <h1>Add a file</h1>
        </legend>
        <p>
          Select a file from your computer or enter the URL of an image file.
          You can optionally add a search comment and alt text.
        </p>
        <FormInput
          type="radio"
          name="uploadType"
          label="URL"
          value="url"
          checked={uploadType === "url"}
          onChange={() => setUploadType("url")}
          style={{ display: "inline-block" }}
        />
        &nbsp;
        <FormInput
          type="radio"
          name="uploadType"
          label="File"
          value="file"
          checked={uploadType === "file"}
          onChange={() => setUploadType("file")}
          style={{ display: "inline-block" }}
        />
        {uploadType === "url" ? (
          <FormInput name="url" label="URL" required />
        ) : (
          <FormInput name="file" label="File" required type="file" />
        )}
        <FormInput name="filename" label="Filename" required />
        <FormInput type="textarea" name="comment" label="Comment" />
        <FormInput type="textarea" name="altText" label="Alt text" />
        <SubmitButton />
      </fieldset>
    </ValidatedForm>
  );
}
