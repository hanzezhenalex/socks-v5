import {
  Connection,
  getAddrChecker,
  IContext,
  replySocketAddr,
} from "./shared";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import { AddressInfo, Socket } from "net";
import { createServer } from "../../net/stream";
import { NetworkUnreachable } from "../errors";

export const Bind = {
  name: "connect",
  method: 0x02,
  handler: async (
    ctx: IContext,
    request: CommandNegotiation.Message,
    from: TcpSocket
  ): Promise<Connection> => {
    const srv = await createServer(ctx.getServerAddr());

    // Two replies are sent from the SOCKS server to the client during a BIND operation.
    // The first is sent after the server creates and binds a new socket.
    // The BND.PORT field contains the port number that the SOCKS server assigned to listen for an incoming connection.
    // The BND.ADDR field contains the associated IP address.
    await replySocketAddr(from, srv.address() as AddressInfo);

    const isTargetAddr = await getAddrChecker(request);

    const _sock = await new Promise<Socket>((resolve, reject) => {
      srv.on("connection", (socket) => {
        if (isTargetAddr(socket.address() as AddressInfo)) {
          resolve(socket);
          srv.removeAllListeners("connection");
          srv.removeAllListeners("error");
        } else {
          socket.end();
        }
      });
      srv.on("error", (err) => {
        console.error(err);
        reject(NetworkUnreachable);
      });
    });

    // The second reply occurs only after the anticipated incoming connection succeeds or fails.
    await replySocketAddr(from, {
      address: _sock.remoteAddress ? _sock.remoteAddress : "",
      family: _sock.remoteFamily ? _sock.remoteFamily : "",
      port: _sock.remotePort ? _sock.remotePort : 0,
    });
    return { socket: _sock, _type: "tcp" };
  },
};
