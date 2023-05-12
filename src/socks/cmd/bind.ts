import { IContext, replySocketAddr } from "./shared";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import { AddressInfo, Socket } from "net";
import { dnsLoopUp } from "../../net/dns";
import { createServer } from "../../net/stream";
import { NetworkUnreachable } from "../errors";

export const Bind = {
  name: "connect",
  method: 0x01,
  handler: async (
    ctx: IContext,
    request: CommandNegotiation.Message,
    from: TcpSocket
  ): Promise<Socket> => {
    const srv = await createServer(ctx.getServerAddr());
    await replySocketAddr(from, srv.address() as AddressInfo);

    const allowedPort = request.getTargetPort();
    const allowedIp = request.needDnsLookUp()
      ? await dnsLoopUp(request.getTargetAddr())
      : request.getTargetAddr();

    const isTargetAddr = (addr: AddressInfo): boolean => {
      return !(
        (allowedPort != 0 && allowedPort != addr.port) ||
        (allowedIp.length > 0 && allowedIp != addr.address)
      );
    };

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

    await replySocketAddr(from, _sock.address() as AddressInfo);
    return _sock;
  },
};
