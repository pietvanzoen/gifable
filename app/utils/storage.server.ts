import env from "./env";
import FileStorage from "./file-storage";

let storage: FileStorage;

declare global {
  var __storage: FileStorage | undefined;
}

const storageOptions = {
  bucket: env.require("S3_BUCKET"),
  basePath: env.get("S3_BASE_PATH"),
  storageBaseURL: env.require("S3_STORAGE_BASE_URL"),
  storage: {
    endPoint: env.require("S3_ENDPOINT"),
    port: Number(env.get("S3_PORT")) || undefined,
    useSSL: env.get("S3_USE_SSL")
      ? env.get("S3_USE_SSL") === "true"
      : undefined,
    accessKey: env.require("S3_ACCESS_KEY"),
    secretKey: env.require("S3_SECRET_KEY"),
    region: env.get("S3_REGION"),
  },
};

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === "production") {
  storage = new FileStorage(storageOptions);
} else {
  if (!global.__storage) {
    global.__storage = new FileStorage(storageOptions);
  }
  storage = global.__storage;
}

export { storage };
