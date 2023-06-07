import express from "express";

export interface Context {
  serverAddr: string;
  user: string | undefined;
  token?: string;
}

export function createContextMiddleware(serverAddr: string) {
  return function (
    req: express.Request,
    res: express.Response,
    next: Function
  ) {
    if (req.url === "") {
    } else {
      req.context = {
        serverAddr: serverAddr,
        user: undefined,
      };
    }
    next();
  };
}
