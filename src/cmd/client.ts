import net from "net";
import { pipe } from "../net/pipe";
import { createConnection, createServer } from "../net/stream";

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

  start = async () => {
    this._srv = await createServer(this._cfg.clientPort, this._cfg.clientIP);
    this._srv.on("connection", this.onConnection);
  };

  private newConnToSocksServer = async (): Promise<net.Socket> => {
    return await createConnection(this._cfg.serverPort, this._cfg.serverIP);
  };

  private onConnection = async (from: net.Socket) => {
    let to: net.Socket;
    try {
      to = await this.newConnToSocksServer();
    } catch (e) {
      from.end();
      return;
    }
    pipe(from, to);
  };
}
