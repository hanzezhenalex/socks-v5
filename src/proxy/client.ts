import net from "net";
import { Addressing, MethodSelection, STAGE } from "../socks/socks5";
import { pipe } from "../net/pipe";
import { createConnection, createServer } from "../net/create";
import { ClientConn, ServerConn, ServerConnError } from "./common";
import { NO_ACCEPTABLE_METHODS, getAuthHandler } from "../socks/auth/factory";

interface Config {
  clientIP: string;
  clientPort: number;

  serverIP: string;
  serverPort: number;
}

export class Client {
  private _cfg: Config;
  private _srv: net.Server | undefined;

  constructor(cfg: Config) {
    this._cfg = cfg;
  }

  Start = async () => {
    this._srv = await createServer(this._cfg.clientPort, this._cfg.clientIP);
    this._srv.on("connection", this.onConnection);
  };

  private newConnToSocksServer = async (): Promise<ServerConn> => {
    var conn = await createConnection(this._cfg.serverPort, this._cfg.serverIP);
    return new ServerConn(conn);
  };

  private onConnection = async (socket: net.Socket) => {
    var from = new ClientConn(socket);
    var to: ServerConn | undefined;
    var stage: STAGE = STAGE.PREPARING;

    try {
      to = await this.newConnToSocksServer();
    } catch (e) {
      from.close();
      return;
    }

    try {
      // version identify and method selection
      stage = STAGE.ADDRESSING;
      var methodRequest = await MethodSelection.readReq(from);
      await to.write(methodRequest.toBuffer());
      var methodRep = await MethodSelection.readReply(to);

      // auth check
      stage = STAGE.AUTHENTICATION;
      var handler = getAuthHandler(methodRep.getMethod());
      if (!handler) {
        await from.write(NO_ACCEPTABLE_METHODS);
        throw new Error(`Auth method not found, method=${methodRep.getMethod()}`);
      }
      await from.write(methodRep.toBuffer());
      if (handler.clientHandler) {
        await handler.clientHandler(from, to);
      }

      stage = STAGE.ADDRESSING;
      var addrRequest = await Addressing.readMessage(from);
      await to.write(addrRequest.toBuffer());

      var addrRep = await Addressing.readMessage(to);
      await from.write(addrRep.toBuffer());

      if (addrRep.getCmdOrRep() !== Addressing.SUCCEED) {
        throw new Error(`Address fails, reason=${addrRep.getCmdOrRep()}`);
      }
    } catch (e) {
      console.log(e);

      if (stage === STAGE.ADDRESSING && (e as ServerConnError)) {
        if (from.__sock.writable) {
          from.write(Addressing.SERVER_INTERNAL_ERROR);
        }
      }

      from.close();
      to.close();
      return;
    }

    stage = STAGE.PIPING;
    from.stopWatchEvents();
    to.stopWatchEvents();
    pipe(from.__sock, to.__sock);
  };
}
