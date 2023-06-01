import express from "express";

interface Config {
  commands: string[];
  auths: string[];
}

interface onboardingReq {}

interface onboardingReply {
  commands: string[];
  auths: string[];
}

interface ServerHandler {
  name(): string;
  registerEndpoint(app: express.Express): void;
}

class Coordinator {
  private readonly cfg: Config;
  private readonly app: express.Express;
  private readonly commands: string[];
  private readonly auths: string[];

  constructor(cfg: Config) {
    this.cfg = cfg;
    this.app = express();
    this.commands = [];
    this.auths = [];
  }

  init() {
    this.registerEndpoints();
  }

  registerCommand(command: ServerHandler) {
    this.commands.push(command.name());
    command.registerEndpoint(this.app);
  }

  registerAuths(auth: ServerHandler) {
    this.auths.push(auth.name());
    auth.registerEndpoint(this.app);
  }

  registerEndpoints() {
    this.app.post("/v1/onboarding", (req, res) => {
      const _req = req.body as onboardingReq;
      let reply: onboardingReply;
      reply = {
        commands: this.commands,
        auths: this.auths,
      };
      res.json(reply);
    });
  }
}
