import { AuthManager } from "./authManager";
import { Express } from "express";

export interface GetTokenReq {
  username: string;
  password: string;
}

export interface GetTokenReply {
  token: string;
}

export function registerAuthEndpoints(app: Express, auth: AuthManager) {
  app.post("/v1/auth/getToken", async (req, res) => {
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
    res.json({ token: token } as GetTokenReply);
    res.status(200);
  });

  app.post("/v1/auth/createNewUser", async (req, res) => {});
}
