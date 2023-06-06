import { AuthManager } from "./authManager";
import { ConnectionManager } from "./connectionManager";
import { Worker } from "./protocol/worker";
import express from "express";
import * as https from "https";
import { AddressInfo } from "net";

export type AgentMode = "local" | "cluster";
export const localMode = "local";
export const clusterMode = "cluster";

interface Config {
  localIP: string;
  localPort: number;
  remoteIP?: string;
  remotePort?: number;
  commands: string[];
  auths: string[];
  mode: AgentMode;
}

export class Agent {
  private readonly cfg: Config;
  private readonly auth: AuthManager;
  private readonly proxy: ConnectionManager;
  private readonly protocolHandler: Worker;

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

    console.info(`Agent started, cfg=${JSON.stringify(this.cfg)}`);
  }

  close() {
    this.protocolHandler.close();
  }

  private async startLocalMode() {
    const app = express();
    // middleware
    app.use(express.json());


    const srv = https.createServer(app);
    srv.listen(() => {
      console.log(
        `server is running at  ${(srv.address() as AddressInfo).toString()}`
      );
    });
  }
}
