import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, useActionData, useLoaderData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";

import { db } from "~/utils/db.server";
import { getUser, requireUserId } from "~/utils/session.server";
import {
  storeBuffer,
  makeThumbnailFilename,
  getMediaLabels,
  downloadUrl,
} from "~/utils/media.server";
import bytes from "bytes";
import { useEffect, useState } from "react";
import { getTitle } from "~/utils/media";
import { makeTitle } from "~/utils/meta";
import Alert from "~/components/Alert";
import { conflict } from "~/utils/request.server";
import style from "~/styles/new.css";
import { MediaSchema } from "~/utils/validators";
import { formatBytes } from "~/utils/format";
import classNames from "classnames";
import { getImageData } from "~/utils/image.server";
import { isRateLimited, rateLimitError } from "~/utils/rate-limiter.server";

const UPLOAD_RATE_LIMITER_OPTIONS = {
  keyPrefix: "upload",
  points: 5,
  duration: 60,
};

const fileFields = MediaSchema.extend({
  uploadType: z.literal("file"),
  file: z.any(),
});

const urlFields = MediaSchema.extend({
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
  const userId = await requireUserId(request);

  const resp = await isRateLimited(userId, UPLOAD_RATE_LIMITER_OPTIONS);

  if (resp) return rateLimitError(resp);

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

  const result = await validator.validate(formData);
  if (result.error) return validationError(result.error, result.submittedData);

  const user = await getUser(request);
  if (!user) throw new Error("User not found");

  const { labels, altText, uploadType, filename } = result.data;

  const userFilename = `${user.username}/${filename}`;

  let fileHash: string;
  let mediaUrl: string;
  let size: number;

  const buffer =
    uploadType === "url"
      ? await downloadUrl(result.data.url)
      : Buffer.from(await result.data.file.arrayBuffer());

  try {
    const resp = await storeBuffer(buffer, userFilename);
    mediaUrl = resp.url;
    fileHash = resp.hash;
    size = resp.size;
  } catch (error: any) {
    if (error?.message === "File already exists") {
      return conflict({
        repopulateFields: result.data,
        message: `Filename ${filename} already exists`,
      });
    }
    throw error;
  }

  const { thumbnail, ...imageData } = await getImageData(buffer);

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
      fileHash,
    },
  });

  return redirect(`/media/${media.id}/edit?new=true`);
}

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const terms = await getMediaLabels({
    limit: 5,
    randomize: true,
    filter: ([term]) => term.split(" ").length === 1,
  });
  const prepopulateData = Object.fromEntries(
    new URLSearchParams(request.url.split("?")[1])
  );
  if (prepopulateData.url) {
    prepopulateData.filename = getTitle(prepopulateData.url);
  }
  if (!prepopulateData.uploadType) {
    prepopulateData.uploadType = "url";
  }
  return json({
    prepopulateData,
    terms,
  });
}

export default function NewMediaRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const isHydrated = useHydrated();
  const [filename, setFilename] = useState(data.prepopulateData.filename || "");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileDimentions, setFileDimentions] = useState<[number, number] | null>(
    null
  );
  const uploadType =
    actionData?.repopulateFields?.uploadType || data.prepopulateData.uploadType;

  const setFilenameIfNotSet = (value: string) => {
    if (filename) return;
    setFilename(value);
  };

  useEffect(() => {
    if (actionData?.repopulateFields) {
      return;
    }
    if (data.prepopulateData.url) {
      setPreviewImage(data.prepopulateData.url);
    }
  }, [data, actionData]);

  return (
    <ValidatedForm
      validator={validator}
      defaultValues={actionData?.repopulateFields || data.prepopulateData}
      method="post"
      noValidate={isHydrated}
      encType="multipart/form-data"
    >
      <fieldset>
        <legend>
          <h1>Add a file</h1>
        </legend>
        <p>
          Add a file to your collection by selecting a file from your computer
          or entering the URL of an image file.
        </p>
        <div className="button-group">
          {[
            ["url", "URL"],
            ["file", "File"],
          ].map(([value, label]) => {
            const active = uploadType === value;
            return (
              <Link
                key={value}
                to={`?uploadType=${value}`}
                aria-current={active ? "page" : undefined}
                className={classNames({ active }, "button")}
                preventScrollReset={true}
                replace={true}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <FormInput type="hidden" name="uploadType" value={uploadType} />
        <div className="file-box">
          <div className="file-input">
            {uploadType === "url" ? (
              <FormInput
                type="url"
                name="url"
                label="URL"
                required
                onBlur={async (event) => {
                  const url = event.target.value;
                  setFilenameIfNotSet(getTitle(url));
                  setPreviewImage(url);
                  setFileSize(url ? await getFileSize(url) : null);
                }}
              />
            ) : (
              <>
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
                    setFileSize(file.size);
                  }}
                />
              </>
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
                  <img
                    src={previewImage}
                    alt="Preview"
                    onLoad={({ target }) => {
                      const img = target as HTMLImageElement;
                      if (!img.naturalWidth) {
                        setFileDimentions(null);
                        return;
                      }
                      setFileDimentions([img.naturalWidth, img.naturalHeight]);
                    }}
                  />
                ) : (
                  <div className="file-placeholder" />
                )}
                {(fileSize || fileDimentions) && (
                  <figcaption>
                    Size: {fileDimentions?.join(" ⅹ ")} •{" "}
                    {formatBytes(fileSize)}
                  </figcaption>
                )}
              </figure>
            )}
          </div>
        </div>

        <br />
        <center>
          <Alert>{actionData?.message}</Alert>
          <SubmitButton aria-label="Upload media">📸 Upload</SubmitButton>
        </center>
      </fieldset>
    </ValidatedForm>
  );
}

async function getFileSize(url: string): Promise<number | null> {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    const contentLength = resp.headers.get("content-length");
    return contentLength ? Number(contentLength) : null;
  } catch (error: any) {
    return null;
  }
}
