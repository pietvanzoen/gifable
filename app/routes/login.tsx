import { json, type ActionArgs } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import { getClientIPAddress, useHydrated } from "remix-utils";

import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
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
import { isRateLimited, rateLimitError } from "~/utils/rate-limiter.server";
import env from "~/utils/env.server";

const log = debug("app:login");

const validator = withZod(
  UserSchema.extend({
    loginType: z.enum(["login", "register"]),
    redirectTo: z.string().optional(),
  })
);

const LOGIN_RATE_LIMITER_OPTIONS = {
  keyPrefix: "login",
  points: 5,
  duration: 60,
};

const REGISTER_RATE_LIMITER_OPTIONS = {
  keyPrefix: "register",
  points: 1,
  duration: 60,
};

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
  log("Handling login action");

  const form = await request.formData();
  const result = await validator.validate(form);

  if (result.error) return validationError(result.error, result.submittedData);

  const { loginType, username, password, redirectTo = "" } = result.data;

  switch (loginType) {
    case "login": {
      log("Logging in user %s", username);

      const resp = await isRateLimited(username, LOGIN_RATE_LIMITER_OPTIONS);
      if (resp) return rateLimitError(resp);

      const user = await login({ username, password });
      if (!user) {
        log("User %s not found", username);
        return badRequest({
          repopulateFields: result.submittedData,
          message: `Username/Password combination is incorrect`,
        });
      }

      return createUserSession(user.id, redirectTo);
    }

    case "register": {
      if (env.get("DISABLE_SIGNUP")) {
        log("Signup is disabled");
        return badRequest({
          repopulateFields: result.submittedData,
          message: `Signup is disabled`,
        });
      }

      log("Registering user %s", username);
      const resp = await isRateLimited(
        getClientIPAddress(request) || username,
        REGISTER_RATE_LIMITER_OPTIONS
      );
      if (resp) return rateLimitError(resp);

      const userExists = await db.user.findUnique({
        where: { username },
      });
      if (userExists) {
        log("User %s already exists", username);
        return badRequest({
          repopulateFields: result.submittedData,
          message: `User with username ${username} already exists`,
        });
      }

      log("Creating user %s", username);
      const user = await register({ username, password });

      if (!user) {
        log("Failed to create user %s", username);
        return badRequest({
          repopulateFields: result.submittedData,
          message: `Something went wrong trying to create a new user.`,
        });
      }

      return createUserSession(user.id, redirectTo);
    }

    default: {
      log("Invalid login type %s", loginType);
      return badRequest({
        repopulateFields: result.submittedData,
        message: `Login type invalid`,
      });
    }
  }
}

export function loader() {
  return json({
    allowSignup: !env.get("DISABLE_SIGNUP"),
  });
}

export default function Login() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const defaultValues = actionData?.repopulateFields || {
    redirectTo: searchParams.get("redirectTo") || "/",
    loginType: "login",
  };

  const title = data.allowSignup ? "Login or Register" : "Login";

  return (
    <ValidatedForm
      validator={validator}
      defaultValues={defaultValues}
      method="post"
      noValidate={useHydrated()}
    >
      <fieldset>
        <legend>
          <h1>{title}</h1>
        </legend>
        <FormInput label="Redirect to" type="hidden" name="redirectTo" />
        {data.allowSignup ? (
          <>
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
          </>
        ) : (
          <FormInput
            name="loginType"
            label="Login"
            type="hidden"
            value="login"
          />
        )}
        <FormInput name="username" label="Username" required />
        <FormInput name="password" label="Password" type="password" required />
        <Alert>{actionData?.message}</Alert>
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
