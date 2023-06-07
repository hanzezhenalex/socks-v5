import { AuthManager } from "./authManager";
import { Request, Response } from "express";
import { UserInfo } from "../datastore";
import { Context } from "../context";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      logger: unknown;
      context: Context;
    }
  }
}

export const getToken = "/auth/getToken";
export const createNewUser = "/auth/createNewUser";

export interface GetTokenReq {
  username: string;
  password: string;
}

export function getTokenHandler(auth: AuthManager) {
  return async (req: Request, res: Response) => {
    const user = req.body as GetTokenReq;
    if (
      user.username === undefined ||
      user.username === "" ||
      user.password === undefined ||
      user.password === ""
    ) {
      res.status(400);
      return;
    }
    const token = await auth.fetchToken(user.username, user.password);
    res.setHeader("Authorization", `Bearer ${token}`);
    res.status(200);
    res.json({ token: token });
  };
}

export function createNewUserHandler(auth: AuthManager) {
  return async (req: Request, res: Response) => {
    const user = req.body as UserInfo;
    if (
      user.username === undefined ||
      user.username === "" ||
      user.password === undefined ||
      user.password === ""
    ) {
      res.status(400);
      return;
    }
    auth.addUser(req.context, req.body);
    res.status(200);
  };
}

export function jwtMiddleware(auth: AuthManager) {
  return async (req: Request, res: Response, next: Function) => {
    const context = req.context;
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).end();
    }
    const token = authorization.split(" ");
    if (!(token.length === 2)) {
      return res.status(401).end();
    }
    auth.decodeToken(context, token[1]);
    res.setHeader("Authorization", `Bearer ${req.context.token}`);
    next();
  };
}
