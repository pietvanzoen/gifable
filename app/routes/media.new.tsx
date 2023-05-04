import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";

import { db } from "~/utils/db.server";
import { getUser, requireUserId } from "~/utils/session.server";
import {
  storeURL,
  getImageData,
  storeBuffer,
  makeThumbnailFilename,
  getMediaTerms,
} from "~/utils/media.server";
import bytes from "bytes";
import { useState } from "react";
import MediaCommentInput from "~/components/MediaCommentInput";

const commonFields = z.object({
  filename: z.string().regex(/^[a-z0-9-_]+\.(gif|jpg|png)$/),
  comment: z.string().trim().optional(),
  altText: z.string().trim().optional(),
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

  const user = await getUser(request);
  if (!user) throw new Error("User not found");

  const { comment, uploadType, filename } = result.data;

  const userFilename = `${user.username}/${filename}`;

  const { url: mediaUrl, size } =
    uploadType === "url"
      ? await storeURL(result.data.url, userFilename)
      : await storeBuffer(
          Buffer.from(await result.data.file.arrayBuffer()),
          userFilename
        );

  const { thumbnail, ...imageData } = await getImageData(mediaUrl);

  const thumbnailFilename = makeThumbnailFilename(userFilename);

  let thumbnailUrl: string | null = null;
  if (thumbnail) {
    const resp = await storeBuffer(thumbnail, thumbnailFilename);
    thumbnailUrl = resp.url;
  }

  const media = await db.media.create({
    data: {
      url: mediaUrl,
      thumbnailUrl,
      comment,
      ...imageData,
      size,
      userId,
    },
  });

  return redirect(`/media/${media.id}`);
}

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const terms = await getMediaTerms({
    limit: 5,
    randomize: true,
    filter: ([term]) => term.split(" ").length === 1,
  });
  return json({
    terms,
  });
}

export default function NewMediaRoute() {
  const data = useLoaderData<typeof loader>();
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
          <FormInput type="url" name="url" label="URL" required />
        ) : (
          <FormInput name="file" label="File" required type="file" />
        )}
        <FormInput name="filename" label="Filename" required />
        <MediaCommentInput terms={data.terms} />
        <FormInput type="textarea" name="altText" label="Alt text" />
        <SubmitButton />
      </fieldset>
    </ValidatedForm>
  );
}
