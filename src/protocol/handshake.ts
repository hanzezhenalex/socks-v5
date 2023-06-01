import { TcpSocket } from "../net/socket";
import { AddressTypeNotAllowed, IncorrectVersion } from "./errors";
import { decodeIPv4 } from "../net/stream";

export const Socks5Version = 0x05;
export const RsvBuffer = 0x00;

export namespace MethodNegotiation {
  export class Request {
    private readonly methods: Uint8Array;

    constructor(methods: Uint8Array) {
      this.methods = methods;
    }

    getMethod = (): number[] => {
      const ret: number[] = [];
      for (let i = 0; i < this.methods.length; i++) {
        ret.push(this.methods[i]);
      }
      return ret;
    };
  }

  export async function readReq(socket: TcpSocket): Promise<Request> {
    // +----+----------+----------+
    // |VER | NMETHODS | METHODS  |
    // +----+----------+----------+
    // | 1  |    1     | 1 to 255 |
    // +----+----------+----------+
    const version = await socket.read(1);
    if (version[0] !== Socks5Version) {
      throw IncorrectVersion;
    }
    const n_methods = await socket.read(1);
    const methods = await socket.read(n_methods.readInt8());
    return new Request(methods);
  }

  export async function sendRep(
    socket: TcpSocket,
    method: number
  ): Promise<void> {
    // +----+--------+
    // |VER | METHOD |
    // +----+--------+
    // | 1  |   1    |
    // +----+--------+
    await socket.write(new Uint8Array([Socks5Version, method]));
  }
}

export namespace CommandNegotiation {
  export const SUCCEED = 0x00;

  export const IPv4 = 0x01;
  export const DomainName = 0x03;
  export const IPv6 = 0x04;

  export const IPv4AddrLen = 4;
  export const IPv6AddrLen = 16;

  export class Message {
    private readonly frag: number;
    private readonly cmdOrRep: number;
    private readonly addrType: number;
    private readonly addrLength: number;
    private readonly dstAddr: Uint8Array;
    private readonly dstPort: Buffer;

    constructor(
      cmd_or_rep: number,
      addrType: number,
      addrLength: number,
      dstAddr: Uint8Array,
      dstPort: number | Buffer,
      frag: number = RsvBuffer
    ) {
      this.cmdOrRep = cmd_or_rep;
      this.addrType = addrType;
      this.addrLength = addrLength;
      this.dstAddr = dstAddr;
      this.frag = frag;

      if (typeof dstPort === "number") {
        this.dstPort = Buffer.alloc(2);
        this.dstPort.writeUInt16BE(dstPort);
      } else {
        this.dstPort = dstPort;
      }
    }

    needDnsLookUp(): boolean {
      return this.addrType === DomainName;
    };

    toBuffer = (): Uint8Array => {
      let buffer: Uint8Array;
      let i;
      switch (this.addrType) {
        case IPv4:
          buffer = new Uint8Array(3 + 1 + IPv4AddrLen + 2);
          i = 4;
          for (let j = 0; j < 4; i++, j++) {
            buffer[i] = this.dstAddr[j];
          }
          buffer[8] = this.dstPort[0];
          buffer[9] = this.dstPort[1];
          break;
        case DomainName:
          buffer = new Uint8Array(3 + 1 + 1 + this.addrLength + 2);
          buffer[4] = this.addrLength;
          i = 5;
          for (let j = 0; j < this.addrLength; i++, j++) {
            buffer[i] = this.dstAddr[j];
          }
          buffer[i] = this.dstPort[0];
          buffer[i + 1] = this.dstPort[1];
          break;
        case IPv6:
          buffer = new Uint8Array(3 + 1 + IPv6AddrLen + 2);
          i = 4;

          for (let j = 0; j < 16; i++, j++) {
            buffer[i] = this.dstAddr[j];
          }
          buffer[20] = this.dstPort[0];
          buffer[21] = this.dstPort[1];
          break;
        default:
          throw AddressTypeNotAllowed;
      }
      buffer[0] = Socks5Version;
      buffer[1] = this.cmdOrRep;
      buffer[2] = RsvBuffer;
      buffer[3] = this.addrType;
      return buffer;
    };

    getCmdOrRep = (): number => {
      return this.cmdOrRep;
    };

    getTargetPort = (): number => {
      return this.dstPort.readUint16BE();
    };

    getTargetAddr = (): string => {
      switch (this.addrType) {
        case DomainName:
          return this.dstAddr.toString();
        case IPv4:
          return decodeIPv4(this.dstAddr);
        default:
          throw AddressTypeNotAllowed;
      }
    };
  }

  async function getAddrLength(
    addrType: number,
    conn: { read(n?: number): Promise<Buffer> }
  ): Promise<number> {
    switch (addrType) {
      case IPv4:
        return 4;
      case DomainName:
        const length = await conn.read(1);
        return length.readInt8();
      case IPv6:
        return 16;
      default:
        throw AddressTypeNotAllowed;
    }
  }

  export async function readMessage(conn: {
    read(n?: number): Promise<Buffer>;
  }): Promise<Message> {
    // Socks Request
    // +----+-----+-------+------+----------+----------+
    // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
    // +----+-----+-------+------+----------+----------+
    // | 1  |  1  | X'00' |  1   | Variable |    2     |
    // +----+-----+-------+------+----------+----------+
    // Socks Reply
    // +----+-----+-------+------+----------+----------+
    // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
    // +----+-----+-------+------+----------+----------+
    // | 1  |  1  | X'00' |  1   | Variable |    2     |
    // +----+-----+-------+------+----------+----------+
    await conn.read(1);
    const cmd_or_rep = await conn.read(1);
    const rsv_or_frag = await conn.read(1); // rsv or frag

    const addrType = await conn.read(1);
    const addrLength = await getAddrLength(addrType[0], conn);

    const dstAddr = await conn.read(addrLength);
    const dstPort = await conn.read(2);
    return new Message(
      cmd_or_rep[0],
      addrType[0],
      addrLength,
      dstAddr,
      dstPort,
      rsv_or_frag[0]
    );
  }
}
