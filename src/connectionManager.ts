import net from "net";
import dgram, { RemoteInfo } from "dgram";
import { Context } from "./context";
import { pipe } from "./net/pipe";
import { TcpSocket } from "./net/socket";
import { createConnection, createServer } from "./net/stream";
import udp from "dgram";

type SocketTyp = "udp" | "tcp";

export interface Connection {
  socket: udp.Socket | net.Socket;
  _type: SocketTyp;
  onMessage?(msg: Buffer, info: RemoteInfo): void;
}

export interface ConnectionManager {
  dialTCP(ctx: Context, port: number, addr: string): Promise<TcpSocket>;
  pipe(ctx: Context, sock1: net.Socket, sock2: Connection): void;
  createServer(host: string, port?: number): Promise<net.Server>;
}

export class ConnectionManagement implements ConnectionManager {
  async dialTCP(ctx: Context, port: number, addr: string): Promise<TcpSocket> {
    return new TcpSocket(await createConnection(port, addr));
  }

  async createServer(host: string, port?: number): Promise<net.Server> {
    return await createServer(host, port);
  }

  pipe(ctx: Context, sock: net.Socket, conn: Connection): void {
    if (conn._type === "tcp") {
      pipe(sock, conn.socket as net.Socket);
      return;
    }
    const socket = conn.socket as dgram.Socket;
    socket.on("message", conn.onMessage ? conn.onMessage : () => {});
    socket.on("error", (err) => {
      console.error(err);
      sock.end();
    });
    sock.on("end", () => socket.close());
    sock.on("error", (err) => {
      console.error(err);
      socket.close();
    });
  }
}
