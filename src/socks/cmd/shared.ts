import net, { AddressInfo } from "net";
import { TcpSocket } from "../../net/socket";
import { CommandNegotiation } from "../handshake";
import { parseIP } from "../../net/stream";
import { dnsLoopUp } from "../../net/dns";
import udp, { RemoteInfo } from "dgram";

export interface IContext {
  createConnection(port: number, host?: string): Promise<net.Socket>;
  getServerAddr(): string;
}

export interface ICommandHandler {
  name: string;
  method: number;
  handler(
    ctx: IContext,
    request: CommandNegotiation.Message,
    from: TcpSocket
  ): Promise<Connection>;
}

export interface Connection {
  socket: udp.Socket | net.Socket;
  onMessage?(msg: Buffer, info: RemoteInfo): void;
}

export async function replySocketAddr(
  from: TcpSocket,
  bindAddrInfo: net.AddressInfo
) {
  const reply = new CommandNegotiation.Message(
    CommandNegotiation.SUCCEED,
    (bindAddrInfo as AddressInfo).family === "IPv4" ? 0x01 : 0x04,
    (bindAddrInfo as AddressInfo).family === "IPv4" ? 4 : 16,
    parseIP((bindAddrInfo as AddressInfo).address),
    (bindAddrInfo as AddressInfo).port
  );

  await from.write(reply.toBuffer());
}

export async function getAddrChecker(
  request: CommandNegotiation.Message
): Promise<Function> {
  // It is expected that a SOCKS server will use DST.ADDR and DST.PORT in evaluating the BIND request.
  const allowedPort = request.getTargetPort();
  const allowedIp = request.needDnsLookUp()
    ? await dnsLoopUp(request.getTargetAddr())
    : request.getTargetAddr();

  return (addr: AddressInfo): boolean => {
    return !(
      (allowedPort != 0 && allowedPort != addr.port) ||
      (allowedIp.length > 0 && allowedIp != addr.address)
    );
  };
}
