import type { Media } from "@prisma/client";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { forbidden, notFound, useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";

import { db } from "~/utils/db.server";
import { getMediaTerms } from "~/utils/terms.server";
import { rename } from "~/utils/media.server";
import { requireUser } from "~/utils/session.server";
import MediaCommentInput from "~/components/MediaCommentInput";

const validator = withZod(
  z.object({
    filename: z.string().regex(/^[a-z0-9-_]+\.(gif|jpg|png)$/),
    comment: z.string().trim().optional(),
    altText: z.string().trim().optional(),
  })
);

export async function action({ params, request }: ActionArgs) {
  const user = await requireUser(request);

  const result = await validator.validate(await request.formData());

  if (result.error) return validationError(result.error, result.submittedData);

  const { mediaId: id } = params;
  const { comment, altText } = result.data;

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
    data: { comment, altText, ...renameData },
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
  const terms = await getMediaTerms(db);
  return json({ media, terms });
}

export default function MediaRoute() {
  const { media, terms } = useLoaderData<typeof loader>();
  const filename = media.url.split("/").pop();

  const { url = "", comment = "", altText = "", width, height, color } = media;
  const title = url.split("/").pop();

  return (
    <div>
      <h2>
        <center>Edit {title}</center>
      </h2>
      <figure>
        <center>
          <img
            src={url}
            alt={comment || ""}
            width={width || 300}
            height={height || 200}
            style={{ backgroundColor: color || "#ccc" }}
          />
        </center>
      </figure>

      <ValidatedForm
        id="edit-form"
        validator={validator}
        defaultValues={{
          filename,
          comment: comment || "",
          altText: altText || "",
        }}
        method="post"
        noValidate={useHydrated()}
      >
        <fieldset>
          <legend>
            <h2>Edit info</h2>
          </legend>
          <FormInput
            type="text"
            name="filename"
            label="Filename"
            help="Changing the filename will break the existing url."
            required
          />
          <MediaCommentInput terms={terms} />
          <FormInput type="textarea" name="altText" label="Alt text" />
        </fieldset>
      </ValidatedForm>

      <center>
        <Link to={`/media/${media.id}`} className="button">
          Cancel
        </Link>
        &nbsp;
        <SubmitButton formId="edit-form" />
      </center>
    </div>
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
