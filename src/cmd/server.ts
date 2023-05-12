import { createServer } from "../net/stream";
import {
  CommandNegotiation,
  MethodNegotiation,
  STAGE,
} from "../socks/handshake";
import {
  MethodNotSupported,
  ServerInternalError,
  SocksError,
} from "../socks/errors";
import { TcpSocket } from "../net/socket";
import net from "net";
import { IUserManagement, UserManagement } from "../user";
import { ICommandHandler } from "../socks/cmd/shared";
import { Connect } from "../socks/cmd/connect";
import { IAuthHandler } from "../socks/auth/shared";
import { noAuth } from "../socks/auth/noAuth";

interface Config {
  ip: string;
  port: number;
}

export class Server {
  private _srv: net.Server | undefined;
  private _cfg: Config;

  private auth: IUserManagement;
  private commandHandlers: Map<number, ICommandHandler>;
  private authHandler: Map<number, IAuthHandler>;

  constructor(cfg: Config) {
    this._cfg = cfg;
    this.commandHandlers = new Map<number, ICommandHandler>();
    this.commandHandlers.set(Connect.method, Connect);

    this.authHandler = new Map<number, IAuthHandler>();
    this.authHandler.set(noAuth.method, noAuth);

    this.auth = new UserManagement();
  }

  start = async () => {
    this._srv = await createServer(this._cfg.port, this._cfg.ip);
    this._srv.on("connection", this.onConnection);
  };

  private async onConnection(socket: net.Socket) {
    const from = new TcpSocket(socket);
    let stage: STAGE = STAGE.Preparing;
    let context = this.auth.createUserContext();

    try {
      stage = STAGE.MethodNegotiation;
      const methodRequest = await MethodNegotiation.readReq(from);

      const handler = this.selectAuthMethod(methodRequest.getMethod());
      await MethodNegotiation.sendRep(from, handler.method);

      stage = STAGE.Authentication;
      if (handler.handle) {
        await handler.handle(context, from);
      }

      stage = STAGE.CommandNegotiation;
      const commandRequest = await CommandNegotiation.readMessage(from);
      const commandHandler = this.getCommandHandler(
        commandRequest.getCmdOrRep()
      );
      const to = await commandHandler.handler(context, commandRequest, from);

      stage = STAGE.Piping;
      from.stopWatchEvents();
      context.pipe(from._sock, to);
    } catch (e) {
      console.error(e);

      if (e as SocksError) {
        await (e as SocksError).handle(from);
      } else if (stage === STAGE.CommandNegotiation) {
        if (from._sock.writable) {
          await from.write(ServerInternalError);
        }
      }

      from.close();
    }
  }

  private getCommandHandler(method: number): ICommandHandler {
    const commandHandler = this.commandHandlers.get(method);
    if (!commandHandler) {
      throw MethodNotSupported;
    }
    return commandHandler;
  }

  private selectAuthMethod(targets: number[]): IAuthHandler {
    let ret: IAuthHandler | undefined;
    for (let i = 0; i < targets.length; i++) {
      ret = this.authHandler.get(targets[i]);
      if (ret) {
        return ret;
      }
    }
    throw MethodNotSupported;
  }
}