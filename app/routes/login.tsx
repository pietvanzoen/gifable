import type { ActionArgs } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useActionData,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import { useHydrated } from "remix-utils";

import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { createUserSession, login, register } from "~/utils/session.server";
import { withZod } from "@remix-validated-form/with-zod";
import { z } from "zod";
import { ValidatedForm, validationError } from "remix-validated-form";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";
import Alert from "~/components/Alert";

const validator = withZod(
  z.object({
    loginType: z.enum(["login", "register"]),
    username: z
      .string()
      .min(3)
      .regex(/^[a-z0-9-_]+$/),
    password: z.string().min(6),
    redirectTo: z.string().optional(),
  })
);

export async function action({ request }: ActionArgs) {
  const form = await request.formData();
  const result = await validator.validate(form);

  if (result.error) return validationError(result.error, result.submittedData);

  const { loginType, username, password, redirectTo = "" } = result.data;

  switch (loginType) {
    case "login": {
      const user = await login({ username, password });
      if (!user) {
        return badRequest({
          repopulateFields: result.submittedData,
          formError: `Username/Password combination is incorrect`,
        });
      }

      return createUserSession(user.id, redirectTo);
    }

    case "register": {
      const userExists = await db.user.findUnique({
        where: { username },
      });
      if (userExists) {
        return badRequest({
          repopulateFields: result.submittedData,
          formError: `User with username ${username} already exists`,
        });
      }

      const user = await register({ username, password });
      if (!user) {
        return badRequest({
          repopulateFields: result.submittedData,
          formError: `Something went wrong trying to create a new user.`,
        });
      }
      return createUserSession(user.id, redirectTo);
    }

    default: {
      return badRequest({
        repopulateFields: result.submittedData,
        formError: `Login type invalid`,
      });
    }
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const defaultValues = actionData?.repopulateFields || {
    redirectTo: searchParams.get("redirectTo") || "/",
    loginType: "login",
  };

  return (
    <ValidatedForm
      validator={validator}
      defaultValues={defaultValues}
      method="post"
      noValidate={useHydrated()}
    >
      <fieldset>
        <legend>
          <h1>Login or Register?</h1>
        </legend>
        <FormInput label="Redirect to" type="hidden" name="redirectTo" />
        <FormInput name="loginType" label="Login" type="radio" value="login" />
        <FormInput
          name="loginType"
          label="Register"
          type="radio"
          value="register"
        />
        <FormInput name="username" label="Username" required />
        <FormInput name="password" label="Password" type="password" required />
        <Alert>{actionData?.formError}</Alert>
        <SubmitButton />
      </fieldset>
    </ValidatedForm>
  );
}

export function ErrorBoundary() {
  let error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div className="notice">
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
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
    return (
      <div className="notice">
        <h1>Unknown Error</h1>
        <p>Something went wrong.</p>
      </div>
    );
  }
}
