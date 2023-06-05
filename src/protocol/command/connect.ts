import { ConnCreateError } from "../../net/stream";
import { DnsError, dnsLoopUp } from "../../net/dns";
import { AddressInfo } from "net";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import { HostUnreachable, NetworkUnreachable } from "../errors";
import { Context } from "../../context";
import { Connection, ConnectionManager } from "../../connectionManager";
import { sendAddressInfo } from "./shared";

export const handler = {
  name: "connect",
  method: 0x01,
  handle: handle,
};

async function handle(
  ctx: Context,
  request: CommandNegotiation.Message,
  from: TcpSocket,
  proxy: ConnectionManager
): Promise<Connection> {
  let to: TcpSocket | undefined;
  try {
    to = await proxy.dialTCP(
      ctx,
      request.getTargetPort(),
      request.needDnsLookUp()
        ? await dnsLoopUp(request.getTargetAddr())
        : request.getTargetAddr()
    );

    await sendAddressInfo(from, to._sock.address() as AddressInfo);

    console.log(`receive a CONNECT request, piping now
      source=${from._sock.remoteAddress}:${from._sock.remotePort}, 
      target=${request.getTargetAddr()}`);

    to.stopWatchEvents();
    return { socket: to._sock, _type: "tcp" };
  } catch (e) {
    to?.close();
    if (e as ConnCreateError) {
      throw NetworkUnreachable;
    } else if (e as DnsError) {
      throw HostUnreachable;
    } else {
      throw e;
    }
  }
}
