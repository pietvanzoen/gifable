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
  getMediaLabels,
} from "~/utils/media.server";
import bytes from "bytes";
import { useState } from "react";
import MediaLabelsInput from "~/components/MediaLabelsInput";
import { getTitle } from "~/utils/media";
import { makeTitle } from "~/utils/meta";
import Alert from "~/components/Alert";
import { conflict } from "~/utils/request.server";
import style from "~/styles/new.css";

const commonFields = z.object({
  filename: z.string().regex(/^[a-zA-Z0-9-_]+\.(gif|jpg|png|jpeg)$/),
  labels: z.string().trim().optional(),
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

export function links() {
  return [{ rel: "stylesheet", href: style }];
}

export function meta() {
  return [{ title: makeTitle(["Upload media"]) }];
}

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

  const { labels, altText, uploadType, filename } = result.data;

  const userFilename = `${user.username}/${filename}`;

  let mediaUrl: string;
  let size: number;

  try {
    const resp =
      uploadType === "url"
        ? await storeURL(result.data.url, userFilename)
        : await storeBuffer(
            Buffer.from(await result.data.file.arrayBuffer()),
            userFilename
          );
    mediaUrl = resp.url;
    size = resp.size;
  } catch (error: any) {
    if (error?.message === "File already exists") {
      return conflict({
        repopulateFields: result.data,
        formError: `Filename ${filename} already exists`,
      });
    }
    throw error;
  }

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
      labels,
      altText,
      ...imageData,
      size,
      userId,
    },
  });

  return redirect(`/media/${media.id}`);
}

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const terms = await getMediaLabels({
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
  const isHydrated = useHydrated();
  const [uploadType, setUploadType] = useState<"url" | "file">("url");
  const [filename, setFilename] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const setFilenameIfNotSet = (value: string) => {
    if (filename) return;
    setFilename(value);
  };

  return (
    <ValidatedForm
      validator={validator}
      defaultValues={actionData?.repopulateFields}
      method="post"
      noValidate={isHydrated}
      encType="multipart/form-data"
    >
      <fieldset>
        <legend>
          <h1>Add a file</h1>
        </legend>
        <p>
          Select a file from your computer or enter the URL of an image file.
          You can optionally add a search labels and alt text.
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
        <div className="file-box">
          <div className="file-input">
            {uploadType === "url" ? (
              <FormInput
                type="url"
                name="url"
                label="URL"
                required
                onBlur={(event) => {
                  setFilenameIfNotSet(getTitle(event.target.value));
                  setPreviewImage(event.target.value);
                }}
              />
            ) : (
              <FormInput
                name="file"
                label="File"
                required
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={({ target }) => {
                  const file = (target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const filename = file.name;
                  setFilenameIfNotSet(filename);
                  setPreviewImage(URL.createObjectURL(file));
                }}
              />
            )}
            <FormInput
              name="filename"
              label="Filename"
              autoComplete="off"
              defaultValue={filename}
              required
            />
          </div>
          <div className="file-preview">
            {isHydrated && (
              <figure>
                {previewImage ? (
                  <img src={previewImage} alt="Preview" />
                ) : (
                  <div className="file-placeholder" />
                )}
              </figure>
            )}
          </div>
        </div>
        <MediaLabelsInput terms={data.terms} />
        <FormInput type="textarea" name="altText" label="Alt text" />
        <Alert>{actionData?.formError}</Alert>
        <SubmitButton />
      </fieldset>
    </ValidatedForm>
  );
}
