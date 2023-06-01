import { createServer } from "./net/stream";
import { TcpSocket } from "./net/socket";
import net from "net";
import { CommandNegotiation, MethodNegotiation } from "./protocol/handshake";
import {
  CommandNotSupport,
  NoAcceptableMethods,
  SocksError,
} from "./protocol/errors";
import { AuthHandler } from "./protocol/auth/shared";
import { AuthManager } from "./authManager";
import { CommandHandler } from "./protocol/command/shared";
import { ConnectionManager } from "./connectionManager";

export type AgentMode = "local" | "cluster";

interface Config {
  localIP: string;
  localPort: number;
  remoteIP: string;
  remotePort: number;
  commands: string[];
  auths: string[];
  mode: AgentMode;
}

class Agent {
  private readonly cfg: Config;
  private readonly auth: AuthManager;
  private readonly proxy: ConnectionManager;
  private readonly commandHandlers: Map<number, CommandHandler>;
  private readonly authHandlers: Map<number, AuthHandler>;

  constructor(cfg: Config, auth: AuthManager, proxy: ConnectionManager) {
    this.cfg = cfg;
    this.commandHandlers = new Map<number, CommandHandler>();
    this.authHandlers = new Map<number, AuthHandler>();
    this.auth = auth;
    this.proxy = proxy;
  }

  async start() {
    await this.loadCommandHandlers();
    await this.loadAuthHandlers();

    const tcpServer = await createServer(this.cfg.localIP, this.cfg.localPort);
    tcpServer.on("connection", this.onConnection.bind(this));

    console.info(`Agent started, cfg=${JSON.stringify(this.cfg)}`);
  }

  private async onConnection(socket: net.Socket) {
    const from = new TcpSocket(socket);
    const ctx = { serverAddr: this.cfg.localIP };

    try {
      // method negotiation
      const methodRequest = await MethodNegotiation.readReq(from);

      const methods = methodRequest.getMethod();
      const handler = this.selectAuthMethod(methods);

      await MethodNegotiation.sendRep(from, handler.method);

      // handle auth
      if (handler.handle) {
        await handler.handle(ctx, from, this.auth);
      }

      // command negotiation
      const commandRequest = await CommandNegotiation.readMessage(from);
      const commandHandler = this.getCommandHandler(
        commandRequest.getCmdOrRep()
      );

      const to = await commandHandler.handle(
        ctx,
        commandRequest,
        from,
        this.proxy
      );

      // piping
      from.stopWatchEvents();
      this.proxy.pipe(ctx, from._sock, to);
    } catch (e) {
      console.error(e);
      if (e as SocksError) {
        await (e as SocksError).handle(from);
      }
      from.close();
    }
  }

  private selectAuthMethod(targets: number[]): AuthHandler {
    let ret: AuthHandler | undefined;
    for (let i = 0; i < targets.length; i++) {
      ret = this.authHandlers.get(targets[i]);
      if (ret) {
        return ret;
      }
    }
    throw NoAcceptableMethods;
  }

  private getCommandHandler(method: number): CommandHandler {
    const commandHandler = this.commandHandlers.get(method);
    if (!commandHandler) {
      throw CommandNotSupport;
    }
    return commandHandler;
  }

  private async loadCommandHandlers() {
    for (const command of this.cfg.commands) {
      try {
        const handler = await import(`./protocol/command/${command}`);
        this.commandHandlers.set(handler.handler.method, handler.handler);
      } catch (e) {
        console.warn(`invalid authentication method: ${command}, skipped`);
      }
    }
  }

  private async loadAuthHandlers() {
    for (const command of this.cfg.auths) {
      try {
        const handler = await import(`./protocol/auth/${command}`);
        this.commandHandlers.set(handler.handler.method, handler.handler);
      } catch (e) {
        console.warn(`invalid command: ${command}, skipped`);
      }
    }
  }
}
