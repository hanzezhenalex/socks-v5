import { AuthManager } from "../authManager/authManager";
import { CommandHandler } from "./command/shared";
import { AuthHandler } from "./auth/shared";
import net from "net";
import { createServer } from "../net/stream";
import { TcpSocket } from "../net/socket";
import { CommandNegotiation, MethodNegotiation } from "./handshake";
import { CommandNotSupport, NoAcceptableMethods, SocksError } from "./errors";
import { ConnectionManager } from "../connectionManager";

export class Worker {
  private readonly auth: AuthManager;
  private readonly proxy: ConnectionManager;
  private readonly commandHandlers: Map<number, CommandHandler>;
  private readonly authHandlers: Map<number, AuthHandler>;
  private readonly localIp: string;
  private readonly localPort: number;
  private tcpServer: net.Server | undefined;

  constructor(
    auth: AuthManager,
    proxy: ConnectionManager,
    ip: string,
    port: number
  ) {
    this.commandHandlers = new Map<number, CommandHandler>();
    this.authHandlers = new Map<number, AuthHandler>();
    this.auth = auth;
    this.proxy = proxy;
    this.localIp = ip;
    this.localPort = port;
  }

  async start(commands: string[], auth: string[]) {
    await this.loadCommandHandlers(commands);
    await this.loadAuthHandlers(auth);

    this.tcpServer = await createServer(this.localIp, this.localPort);
    this.tcpServer.on("connection", this.onConnection.bind(this));

    console.info(`Agent started, addr=${this.localIp}:${this.localPort}`);
  }

  private async onConnection(socket: net.Socket) {
    const from = new TcpSocket(socket);
    const ctx = { serverAddr: this.localIp, user: undefined };

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
      if (e instanceof SocksError) {
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

  private async loadCommandHandlers(commands: string[]) {
    for (const command of commands) {
      try {
        const handler = await import(`./command/${command}`);
        this.commandHandlers.set(handler.handler.method, handler.handler);
      } catch (e) {
        console.warn(`invalid authentication method: ${command}, skipped`);
      }
    }
  }

  private async loadAuthHandlers(auths: string[]) {
    for (const auth of auths) {
      try {
        const handler = await import(`./auth/${auth}`);
        this.authHandlers.set(handler.handler.method, handler.handler);
      } catch (e) {
        console.warn(`invalid command: ${auth}, skipped`);
      }
    }
  }

  close() {
    this.tcpServer?.close();
  }
}
