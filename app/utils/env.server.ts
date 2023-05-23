import fs from "fs";
import path from "path";

const BUILD_SHA = fs.readFileSync(path.resolve("./build_sha"), "utf8").trim();

export default {
  get(key: string) {
    return process.env[key];
  },

  require(key: string) {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  },

  get buildSHA() {
    return BUILD_SHA;
  },
};
