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
import { forbidden, useHydrated } from "remix-utils";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

const validator = withZod(
  z.object({
    comment: z.string().optional(),
    altText: z.string().optional(),
  })
);

export async function action({ params, request }: ActionArgs) {
  const userId = await requireUserId(request);

  const result = await validator.validate(await request.formData());

  if (result.error) return validationError(result.error, result.submittedData);

  const { mediaId: id } = params;
  const { comment, altText } = result.data;

  const [media] = await db.media.findMany({
    where: { id, userId },
    select: { id: true },
  });
  if (!media) {
    throw forbidden({ message: `You can't edit this media` });
  }

  await db.media.update({
    where: { id },
    data: { comment, altText },
  });

  return redirect(`/media/${id}`);
}

export async function loader({ params }: LoaderArgs) {
  const media = await db.media.findUnique({
    where: { id: params.mediaId },
  });
  if (!media) {
    throw new Response("What a media! Not found.", {
      status: 404,
    });
  }
  return json({ media });
}

export default function MediaRoute() {
  const { media } = useLoaderData<typeof loader>();

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
        defaultValues={{ comment: comment || "", altText: altText || "" }}
        method="post"
        noValidate={useHydrated()}
      >
        <fieldset>
          <legend>
            <h2>Edit info</h2>
          </legend>
          <FormInput type="textarea" name="comment" label="Comment" />
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
