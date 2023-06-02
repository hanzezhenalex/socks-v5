import { Context } from "../../context";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import net, { AddressInfo } from "net";
import { Connection, ConnectionManager } from "../../connectionManager";
import { encodeIP } from "../../net/stream";
import { dnsLoopUp } from "../../net/dns";
import { IPv4, IPv4AddrLen, IPv6, IPv6AddrLen, succeed } from "../constant";

export interface CommandHandler {
  name: string;
  method: number;
  handle(
    ctx: Context,
    req: CommandNegotiation.Message,
    from: TcpSocket,
    proxy: ConnectionManager
  ): Promise<Connection>;
}

export async function sendAddressInfo(
  from: TcpSocket,
  bindAddrInfo: net.AddressInfo
) {
  const reply = new CommandNegotiation.Message(
    succeed,
    (bindAddrInfo as AddressInfo).family === "IPv4" ? IPv4 : IPv6,
    (bindAddrInfo as AddressInfo).family === "IPv4" ? IPv4AddrLen : IPv6AddrLen,
    encodeIP((bindAddrInfo as AddressInfo).address),
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
