import type { Media } from "@prisma/client";
import type { ActionArgs, LoaderArgs, V2_MetaArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { forbidden, notFound, useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import SubmitButton from "~/components/SubmitButton";

import { db } from "~/utils/db.server";
import { getMediaLabels } from "~/utils/media.server";
import { rename } from "~/utils/media.server";
import { requireUser } from "~/utils/session.server";
import MediaLabelsInput from "~/components/MediaLabelsInput";
import { MediaSchema } from "~/utils/validators";
import FormInput from "~/components/FormInput";
import { useState } from "react";
import { makeTitle } from "~/utils/meta";
import { getTitle } from "~/utils/media";

const validator = withZod(MediaSchema);

export function meta({ data }: V2_MetaArgs<typeof loader>) {
  return [
    { title: makeTitle([`Edit info for ${getTitle(data?.media?.url)}`]) },
  ];
}

export async function action({ params, request }: ActionArgs) {
  const user = await requireUser(request);

  const result = await validator.validate(await request.formData());

  if (result.error) return validationError(result.error, result.submittedData);

  const { mediaId: id } = params;
  const { labels, altText } = result.data;

  const [media] = await db.media.findMany({
    where: { id, userId: user.id },
    select: { id: true, url: true, thumbnailUrl: true },
  });

  if (!media) {
    throw forbidden({ message: `You can't edit this media` });
  }

  let renameData: Pick<Media, "url" | "thumbnailUrl"> | null = null;
  const currentFilename = media.url.split("/").pop();
  if (currentFilename !== result.data.filename) {
    const newFilename = `${user.username}/${result.data.filename}`;
    renameData = await rename(media, newFilename);
  }

  await db.media.update({
    where: { id },
    data: { labels, altText, ...renameData },
  });

  return redirect(`/media/${id}`);
}

export async function loader({ params }: LoaderArgs) {
  const media = await db.media.findUnique({
    where: { id: params.mediaId },
  });
  if (!media) {
    throw notFound({ message: "Media not found" });
  }
  const [matchingMedia, terms] = await Promise.all([
    db.media.findMany({
      where: {
        fileHash: media.fileHash,
        id: { not: media.id },
        AND: [{ altText: { not: "" } }, { altText: { not: null } }],
      },
      select: { url: true, altText: true, labels: true },
      take: 5,
    }),
    getMediaLabels(),
  ]);

  const { altText } = matchingMedia.find(({ altText }) => altText) || {};
  const { labels } = matchingMedia.find(({ labels }) => labels) || {};

  return json({ media, terms, suggestions: { labels, altText } });
}

export default function MediaRoute() {
  const { media, terms, suggestions } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const filename = media.url.split("/").pop();

  const { url = "", width, height, color } = media;
  const [altText, setAltText] = useState(media.altText || "");
  const [labels, setLabels] = useState(media.labels || "");

  const title = url.split("/").pop();

  return (
    <div>
      <ValidatedForm
        id="edit-form"
        validator={validator}
        defaultValues={{
          filename,
          labels,
          altText,
        }}
        method="post"
        noValidate={useHydrated()}
      >
        <fieldset>
          <legend>
            <h2>{isNew ? "Add" : "Edit"} info</h2>
          </legend>
          <h3>
            <center>{title}</center>
          </h3>
          <figure>
            <center>
              <img
                src={url}
                alt={labels || ""}
                width={width || 300}
                height={height || 200}
                style={{ backgroundColor: color || "#ccc", maxWidth: "300px" }}
              />
            </center>
          </figure>
          <br />

          {isNew && (
            <p>
              Add more info about this image. You can edit this later if you
              want.
            </p>
          )}

          <FormInput
            type={isNew ? "hidden" : "text"}
            name="filename"
            label="Filename"
            help="Changing the filename will break the existing url."
            required
          />

          <hr />
          <MediaLabelsInput terms={terms || []} defaultValue={labels} />
          <SuggestedText
            text={suggestions.labels}
            currentText={labels}
            label="labels"
            onClick={setLabels}
          />
          <hr />
          <FormInput
            type="textarea"
            name="altText"
            label="Alt text"
            defaultValue={altText}
            help="Provide a descriptive alternative text (alt text) for the image. Alt text is used to convey the content of an image to folks who are visually impaired or unable to view the image."
          />
          <SuggestedText
            text={suggestions?.altText}
            currentText={altText}
            label="alt text"
            onClick={setAltText}
          />
          <hr />
          <center>
            <Link
              to={`/media/${media.id}`}
              aria-label="Cancel edit"
              className="button"
            >
              {isNew ? "⏭️ Skip for now" : "🚫 Cancel"}
            </Link>
            &nbsp;
            <SubmitButton
              formId="edit-form"
              aria-label="Save edits"
              submitText="Saving..."
            >
              ✅ Save
            </SubmitButton>
          </center>
        </fieldset>
      </ValidatedForm>
    </div>
  );
}

function SuggestedText({
  text,
  currentText,
  onClick,
  label,
}: {
  text: string | null | undefined;
  currentText: string | null | undefined;
  onClick: (text: string) => void;
  label: string;
}) {
  if (!useHydrated()) return null;
  if (currentText) return null;
  if (!text) return null;
  return (
    <small>
      <strong>Suggested {label}:</strong> <em>{text}</em>
      &nbsp;&nbsp;
      <button
        type="button"
        className="link"
        aria-label={`Use suggested ${label} "${text}"`}
        title={`Use suggested ${label} "${text}"`}
        onClick={() => onClick(text)}
      >
        Use suggestion
      </button>{" "}
    </small>
  );
}

export function ErrorBoundary() {
  let error = useRouteError();
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 400: {
        return (
          <div className="notice">What you're trying to do is not allowed.</div>
        );
      }
      case 404: {
        return (
          <div className="notice">
            <h1>Media not found</h1>
          </div>
        );
      }
      case 403: {
        return <div className="notice">Sorry, but this is not your media.</div>;
      }
      default: {
        throw new Error(`Unhandled error: ${error.status}`);
      }
    }
  } else if (error instanceof Error) {
    return (
      <div className="notice">
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}
