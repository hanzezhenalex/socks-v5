import { Context } from "./context";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      logger: unknown;
      context: Context;
    }
  }
}
