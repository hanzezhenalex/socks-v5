import { AuthManager } from "./authManager/authManager";
import { ConnectionManager } from "./connectionManager";
import { Worker } from "./protocol/worker";
import express from "express";
import * as https from "https";
import { createContextMiddleware } from "./context";
import {
  createNewUser,
  createNewUserHandler,
  getToken,
  getTokenHandler,
  jwtMiddleware,
  setTokenMiddleware,
} from "./authManager/httpHandler";
import * as fs from "fs";

export type AgentMode = "local" | "cluster";
export const localMode = "local";
export const clusterMode = "cluster";

interface Config {
  localIP: string;
  localPort: number;
  localServerPort: number;
  tlsKey: string;
  tlsCert: string;
  remoteIP: string;
  remotePort: number;
  commands: string[];
  auths: string[];
  mode: AgentMode;
}

export class Agent {
  private readonly cfg: Config;
  private readonly auth: AuthManager;
  private readonly proxy: ConnectionManager;
  private readonly protocolHandler: Worker;
  private server: https.Server | undefined;

  constructor(cfg: Config, auth: AuthManager, proxy: ConnectionManager) {
    this.cfg = cfg;
    this.auth = auth;
    this.proxy = proxy;
    this.protocolHandler = new Worker(
      auth,
      proxy,
      this.cfg.localIP,
      this.cfg.localPort
    );
  }

  async start() {
    await this.protocolHandler.start(this.cfg.commands, this.cfg.auths);

    if (this.cfg.mode === localMode) {
      await this.startLocalMode();
    }
  }

  close() {
    this.protocolHandler.close();
    this.server?.close();
  }

  private async startLocalMode() {
    const app = express();

    app.use(express.json());
    app.use(setTokenMiddleware());
    app.post(`/v1${getToken}`, getTokenHandler(this.auth));

    const root = express.Router();
    root.use(createContextMiddleware(this.cfg.localIP));
    root.use(jwtMiddleware(this.auth));

    app.use("/", root);

    const v1 = express.Router();
    v1.post(`${createNewUser}`, createNewUserHandler(this.auth));
    app.use("/v1", v1);

    this.server = https.createServer(
      {
        key: fs.readFileSync(this.cfg.tlsKey),
        cert: fs.readFileSync(this.cfg.tlsCert),
      },
      app
    );
    this.server.listen(this.cfg.localServerPort, this.cfg.localIP, () => {
      console.log(
        `control server is running at ${this.cfg.localIP}:${this.cfg.localServerPort}`
      );
    });
  }
}
