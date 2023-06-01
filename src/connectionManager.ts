import net from "net";
import dgram, { RemoteInfo } from "dgram";
import { Context } from "./context";
import { pipe } from "./net/pipe";
import { TcpSocket } from "./net/socket";
import { createConnection } from "./net/stream";
import udp from "dgram";

type SocketTyp = "udp" | "tcp";

export interface Connection {
  socket: udp.Socket | net.Socket;
  _type: SocketTyp;
  onMessage?(msg: Buffer, info: RemoteInfo): void;
}

export interface ConnectionManager {
  createTcpConnection(
    ctx: Context,
    port: number,
    addr: string
  ): Promise<TcpSocket>;
  pipe(ctx: Context, sock1: net.Socket, sock2: Connection): void;
}

class ConnectionManagement {
  async createTcpConnection(
    ctx: Context,
    port: number,
    addr: string
  ): Promise<TcpSocket> {
    return new TcpSocket(await createConnection(port, addr));
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
