import bcrypt from "bcryptjs";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import env from "./env.server";

import { db } from "./db.server";
import debug from "debug";

const log = debug("app:session");

type LoginForm = {
  username: string;
  password: string;
  isAdmin?: boolean;
};

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function register({ username, password, isAdmin }: LoginForm) {
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { username, passwordHash, isAdmin: isAdmin || false },
  });
  const userData = { id: user.id, username, isAdmin: user.isAdmin };
  log("registered user", userData);
  return userData;
}

export async function changePassword({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const passwordHash = await hashPassword(password);
  await db.user.update({
    where: { username },
    data: { passwordHash },
  });
  log("changed password for user %s", username);
}

export async function login({ username, password }: LoginForm) {
  const validPassword = await checkPassword({ username, password });
  if (!validPassword) return null;
  const user = await db.user.update({
    where: { username },
    data: { lastLogin: new Date() },
  });
  log("logged in user", username);
  return { id: user.id, username };
}

export async function checkPassword({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const user = await db.user.findUnique({
    where: { username },
  });
  if (!user) return false;
  const isCorrectPassword = await bcrypt.compare(password, user.passwordHash);
  return isCorrectPassword;
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [env.require("SESSION_SECRET")],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;

  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<string> {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  await requireUserId(request);

  const user = await getUser(request);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isAdmin: true },
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  log("created session for user", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
