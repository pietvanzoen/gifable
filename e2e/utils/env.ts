import dotenv from "dotenv";
dotenv.config({ path: ".env.e2e" });

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
};
