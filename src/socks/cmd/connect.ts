import { ConnCreateError } from "../../net/stream";
import { DnsError, dnsLoopUp } from "../../net/dns";
import { AddressInfo } from "net";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import { HostUnreachable, NetworkUnreachable } from "../errors";
import { Connection, IContext, replySocketAddr } from "./shared";

export const Connect = {
  name: "connect",
  method: 0x01,
  handler: handle,
};

async function handle(
  ctx: IContext,
  request: CommandNegotiation.Message,
  from: TcpSocket
): Promise<Connection> {
  let to: TcpSocket | undefined;
  try {
    to = new TcpSocket(
      await ctx.createConnection(
        request.getTargetPort(),
        request.needDnsLookUp()
          ? await dnsLoopUp(request.getTargetAddr())
          : request.getTargetAddr()
      )
    );

    await replySocketAddr(from, to._sock.address() as AddressInfo);

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
