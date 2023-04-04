import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

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
