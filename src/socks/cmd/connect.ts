// try to create connection to target server
import { ConnCreateError } from "../../net/stream";
import { DnsError, dnsLoopUp } from "../../net/dns";
import { Socket, AddressInfo } from "net";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import { HostUnreachable, NetworkUnreachable } from "../errors";
import { IContext } from "./shared";

export const Connect = {
  name: "connect",
  method: 0x01,
  handler: handle,
};

async function handle(
  ctx: IContext,
  request: CommandNegotiation.Message,
  from: TcpSocket
): Promise<Socket> {
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
    const bindAddrInfo: AddressInfo | {} = to._sock.address();
    const reply = new CommandNegotiation.Message(
      CommandNegotiation.SUCCEED,
      (bindAddrInfo as AddressInfo).family === "IPv4" ? 0x01 : 0x04,
      (bindAddrInfo as AddressInfo).family === "IPv4" ? 4 : 16,
      stringToUint8Array((bindAddrInfo as AddressInfo).address),
      (bindAddrInfo as AddressInfo).port
    );

    await from.write(reply.toBuffer());

    console.log(`receive a CONNECT request, 
      source=${from._sock.address().toString()}, 
      target=${request.getTargetAddr()}, 
      command negotiation finished, start piping`);

    to.stopWatchEvents();
    return to._sock;
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

function stringToUint8Array(str: string) {
  const arr = [];
  let i = 0,
    j = str.length;
  for (; i < j; ++i) {
    arr.push(str.charCodeAt(i));
  }
  return new Uint8Array(arr);
}
