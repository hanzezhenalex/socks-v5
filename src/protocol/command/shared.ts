import { Context } from "../../context";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import dgram from "dgram";
import net, { AddressInfo } from "net";
import {Connection, ConnectionManager} from "../../connectionManager";
import { encodeIP } from "../../net/stream";
import IPv4 = CommandNegotiation.IPv4;
import IPv6 = CommandNegotiation.IPv6;
import IPv6AddrLen = CommandNegotiation.IPv6AddrLen;
import IPv4AddrLen = CommandNegotiation.IPv4AddrLen;
import {dnsLoopUp} from "../../net/dns";

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
    CommandNegotiation.SUCCEED,
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
