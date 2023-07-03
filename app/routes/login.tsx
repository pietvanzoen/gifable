import type { ActionArgs } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useActionData,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import { getClientIPAddress, useHydrated } from "remix-utils";

import { db } from "~/utils/db.server";
import { badRequest, tooManyRequests } from "~/utils/request.server";
import { createUserSession, login, register } from "~/utils/session.server";
import { withZod } from "@remix-validated-form/with-zod";
import { z } from "zod";
import { ValidatedForm, validationError } from "remix-validated-form";
import FormInput from "~/components/FormInput";
import SubmitButton from "~/components/SubmitButton";
import Alert from "~/components/Alert";
import debug from "debug";
import { UserSchema } from "~/utils/validators";
import { makeTitle } from "~/utils/meta";
import styles from "~/styles/login.css";
import { rateLimiter } from "~/utils/rate-limiter.server";
import { RateLimiterRes } from "rate-limiter-flexible";

const log = debug("app:login");

const validator = withZod(
  UserSchema.extend({
    loginType: z.enum(["login", "register"]),
    redirectTo: z.string().optional(),
  })
);

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function meta() {
  return [
    { title: makeTitle(["Login"]) },
    { description: "Your personal gif library." },
  ];
}

export async function action({ request }: ActionArgs) {
  const authRateLimiter = rateLimiter({
    keyPrefix: "auth",
    points: 5,
    duration: 60,
  });

  log("Handling login action");

  const form = await request.formData();
  const result = await validator.validate(form);

  if (result.error) return validationError(result.error, result.submittedData);

  const { loginType, username, password, redirectTo = "" } = result.data;

  try {
    await authRateLimiter.consume(getClientIPAddress(request) || username);
  } catch (e) {
    if (e instanceof RateLimiterRes) {
      log("Rate limit exceeded for %s", username);
      return tooManyRequests({
        repopulateFields: result.submittedData,
        formError: `Too many attempts. You can try again in ${Math.round(
          e.msBeforeNext / 1000
        )} seconds.`,
      });
    }
    throw e;
  }

  switch (loginType) {
    case "login": {
      log("Logging in user %s", username);
      const user = await login({ username, password });
      if (!user) {
        log("User %s not found", username);
        return badRequest({
          repopulateFields: result.submittedData,
          formError: `Username/Password combination is incorrect`,
        });
      }

      return createUserSession(user.id, redirectTo);
    }

    case "register": {
      log("Registering user %s", username);
      const userExists = await db.user.findUnique({
        where: { username },
      });
      if (userExists) {
        log("User %s already exists", username);
        return badRequest({
          repopulateFields: result.submittedData,
          formError: `User with username ${username} already exists`,
        });
      }

      log("Creating user %s", username);
      const user = await register({ username, password });

      if (!user) {
        log("Failed to create user %s", username);
        return badRequest({
          repopulateFields: result.submittedData,
          formError: `Something went wrong trying to create a new user.`,
        });
      }

      return createUserSession(user.id, redirectTo);
    }

    default: {
      log("Invalid login type %s", loginType);
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
        <FormInput
          name="loginType"
          label="Login"
          type="radio"
          value="login"
          checked
        />
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
