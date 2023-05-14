import {
  Connection,
  getAddrChecker,
  IContext,
  replySocketAddr,
} from "./shared";
import { CommandNegotiation } from "../handshake";
import { TcpSocket } from "../../net/socket";
import { RemoteInfo } from "dgram";
import { createSocket } from "../../net/dgram";
import readMessage = CommandNegotiation.readMessage;
import { dnsLoopUp } from "../../net/dns";
import { parseIP } from "../../net/stream";

export const UdpAssociate = {
  name: "udp associate",
  method: 0x03,
  handler: async (
    ctx: IContext,
    request: CommandNegotiation.Message,
    from: TcpSocket
  ): Promise<Connection> => {
    const socket = await createSocket(ctx.getServerAddr());
    await replySocketAddr(from, socket.address());
    const isClientUDPAddr = await getAddrChecker(request);

    return {
      socket: socket,
      async onMessage(msg: Buffer, info: RemoteInfo) {
        if (
          isClientUDPAddr({
            address: info.address,
            port: info.port,
            family: info.family,
          })
        ) {
          const req = await messageFromBuffer(msg);
          if (req.frag != 0x00) {
            // Implementation of fragmentation is optional; an implementation that
            // does not support fragmentation MUST drop any datagram whose FRAG
            // field is other than 0x00.
            return;
          }
          socket.send(req.data, req.dstPort, req.dstAddr);
        } else {
          const headerBuffer = new CommandNegotiation.Message(
            0,
            info.family === "IPv4" ? 0x01 : 0x04,
            info.family === "IPv4" ? 4 : 16,
            parseIP(info.address),
            info.port
          ).toBuffer();
          socket.send(
            new Buffer([headerBuffer, msg]),
            request.getTargetPort(),
            request.getTargetAddr()
          );
        }
      },
    };
  },
};

// +----+------+------+----------+----------+----------+
// |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +----+------+------+----------+----------+----------+
// | 2  |  1   |  1   | Variable |    2     | Variable |
// +----+------+------+----------+----------+----------+

class BufferReader {
  private buffer: Buffer;
  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }
  read(n?: number): Promise<Buffer> {
    let ret: Buffer;
    if (!n) {
      ret = this.buffer;
      this.buffer = this.buffer.subarray(this.buffer.length - 1);
    } else {
      ret = this.buffer.subarray(n);
      this.buffer = this.buffer.subarray(n, this.buffer.length);
    }
    return Promise.resolve(ret);
  }
}

interface Message {
  frag?: number;
  dstAddr: string;
  dstPort: number;
  data: Uint8Array;
}

async function messageFromBuffer(buffer: Buffer): Promise<Message> {
  const reader = new BufferReader(buffer);
  const header = await readMessage(reader);
  return {
    dstAddr: header.needDnsLookUp()
      ? await dnsLoopUp(header.getTargetAddr())
      : header.getTargetAddr(),
    dstPort: header.getTargetPort(),
    data: await reader.read(),
  };
}
