import type { ActionArgs, LoaderArgs, V2_MetaArgs } from "@remix-run/node";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, useActionData, useLoaderData } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { notFound, useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";
import { storage } from "~/utils/s3-storage.server";

import { db } from "~/utils/db.server";
import { getUser, requireUserId } from "~/utils/session.server";
import bytes from "bytes";
import { getTitle } from "~/utils/media";
import { makeTitle } from "~/utils/meta";
import Alert from "~/components/Alert";
import style from "~/styles/new.css";
import { formatBytes } from "~/utils/format";
import classNames from "classnames";
import { getImageData } from "~/utils/image.server";
import { isRateLimited, rateLimitError } from "~/utils/rate-limiter.server";
import {
  downloadUrl,
  makeThumbnailFilename,
  storeBuffer,
} from "~/utils/media.server";
import { useState } from "react";

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
};

const UPLOAD_RATE_LIMITER_OPTIONS = {
  keyPrefix: "upload",
  points: 5,
  duration: 60,
};

const fileFields = z.object({
  uploadType: z.literal("file"),
  file: z.any(),
});

const urlFields = z.object({
  uploadType: z.literal("url"),
  url: z.string().url(),
});

const validator = withZod(
  z.discriminatedUnion("uploadType", [fileFields, urlFields])
);

export function links() {
  return [{ rel: "stylesheet", href: style }];
}

export function meta({ data }: V2_MetaArgs<typeof loader>) {
  return [{ title: makeTitle([`Replace ${getTitle(data?.media?.url)}`]) }];
}

export async function action({ params, request }: ActionArgs) {
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

  const originalMedia = await db.media.findUnique({
    where: { id: params.mediaId },
  });

  if (!originalMedia) {
    throw notFound({ message: "Media not found" });
  }

  const { uploadType } = result.data;

  const originalFilename = storage().getFilenameFromURL(originalMedia.url);
  if (!originalFilename) {
    throw new Error("Invalid media URL");
  }
  const originalThumbnailFilename = makeThumbnailFilename(originalFilename);

  let fileHash: string;
  let mediaUrl: string;
  let size: number;

  const buffer =
    uploadType === "url"
      ? await downloadUrl(result.data.url)
      : Buffer.from(await result.data.file.arrayBuffer());

  const deletedFilename = makeDeletedFilename(originalFilename);
  const deletedThumbnailFilename = makeThumbnailFilename(deletedFilename);

  try {
    await storage().rename(originalFilename, deletedFilename);
    await storage().rename(originalThumbnailFilename, deletedThumbnailFilename);

    const resp = await storeBuffer(buffer, originalFilename);
    mediaUrl = resp.url;
    fileHash = resp.hash;
    size = resp.size;

    const { thumbnail, ...imageData } = await getImageData(buffer);

    const thumbnailFilename = makeThumbnailFilename(originalFilename);

    let thumbnailUrl: string | null = null;
    if (thumbnail) {
      const resp = await storeBuffer(thumbnail, thumbnailFilename);
      thumbnailUrl = resp.url;
    }

    await db.media.update({
      where: { id: params.mediaId },
      data: {
        url: mediaUrl,
        thumbnailUrl,
        ...imageData,
        size,
        fileHash,
      },
    });

    await storage().delete(deletedFilename);
    await storage().delete(deletedThumbnailFilename);
  } catch (error: any) {
    await storage().rename(deletedFilename, originalFilename);
    await storage().rename(deletedThumbnailFilename, originalThumbnailFilename);
    throw error;
  }

  return redirect(`/media/${originalMedia.id}`);
}

export async function loader({ params, request }: LoaderArgs) {
  const media = await db.media.findUnique({
    where: { id: params.mediaId },
  });
  if (!media) {
    throw notFound({ message: "Media not found" });
  }
  const query = new URLSearchParams(request.url.split("?")[1]);

  return json({ media, uploadType: query.get("uploadType") || "url" });
}

export default function NewMediaRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const isHydrated = useHydrated();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileDimentions, setFileDimentions] = useState<[number, number] | null>(
    null
  );

  const filename = data.media.url.split("/").pop();
  const extention = filename?.split(".").pop() || "";

  const uploadType =
    actionData?.repopulateFields?.uploadType || data.uploadType;

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
          <h1>Replace {filename}</h1>
        </legend>
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
                  accept={
                    EXTENSION_TO_MIME_TYPE[extention] ||
                    "image/png,image/jpeg,image/gif"
                  }
                  onChange={({ target }) => {
                    const file = (target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    setPreviewImage(URL.createObjectURL(file));
                    setFileSize(file.size);
                  }}
                />
              </>
            )}
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
          <p>Replaced images may take a few minutes to update.</p>
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

function makeDeletedFilename(filename: string) {
  const ts = Date.now();
  return `__deleted__/${ts}-${filename.replace("/", "-")}`;
}
