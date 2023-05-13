import { TcpSocket } from "../net/socket";
import { noAuth } from "./auth/noAuth";
import {
  AddressTypeNotAllowed,
  CommandNotSupport,
  IncorrectVersion,
  MethodNotSupported,
} from "./errors";
import { Connect } from "./cmd/connect";
import net from "net";

export const SOCKS5_VERSION = 0x05;
export const RSV_BUFFER = 0x00;

export enum STAGE {
  Preparing = 0,
  MethodNegotiation = 1,
  Authentication = 2,
  CommandNegotiation = 3,
  Piping = 4,
}

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
    if (version[0] !== SOCKS5_VERSION) {
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
    await socket.write(new Uint8Array([SOCKS5_VERSION, method]));
  }
}

export namespace CommandNegotiation {
  export const SUCCEED = 0x00;

  export class Message {
    private readonly cmd_or_rep: number;
    private readonly atyp: number;
    private readonly addrLength: number;
    private readonly dstAddr: Uint8Array;
    private readonly dstPort: Buffer;

    constructor(
      cmd_or_rep: number,
      atyp: number,
      addrLength: number,
      dstAddr: Uint8Array,
      dstPort: number | Buffer
    ) {
      this.cmd_or_rep = cmd_or_rep;
      this.atyp = atyp;
      this.addrLength = addrLength;
      this.dstAddr = dstAddr;

      if (typeof dstPort === "number") {
        this.dstPort = Buffer.alloc(2);
        this.dstPort.writeUInt16BE(dstPort);
      } else {
        this.dstPort = dstPort;
      }
    }

    needDnsLookUp = (): boolean => {
      return this.atyp === 0x03;
    };

    toBuffer = (): Uint8Array => {
      let buffer: Uint8Array;
      let i;
      switch (this.atyp) {
        case 0x01:
          buffer = new Uint8Array(3 + 1 + 4 + 2);
          i = 4;
          for (let j = 0; j < 4; i++, j++) {
            buffer[i] = this.dstAddr[j];
          }
          buffer[8] = this.dstPort[0];
          buffer[9] = this.dstPort[1];
          break;
        case 0x03:
          buffer = new Uint8Array(3 + 1 + 1 + this.addrLength + 2);
          buffer[4] = this.addrLength;
          i = 5;
          for (let j = 0; j < this.addrLength; i++, j++) {
            buffer[i] = this.dstAddr[j];
          }
          buffer[i] = this.dstPort[0];
          buffer[i + 1] = this.dstPort[1];
          break;
        case 0x04:
          buffer = new Uint8Array(3 + 1 + 16 + 2);
          i = 4;

          for (let j = 0; j < 16; i++, j++) {
            buffer[i] = this.dstAddr[j];
          }
          buffer[20] = this.dstPort[0];
          buffer[21] = this.dstPort[1];
          break;
        default:
          throw new Error("Unknown addr type");
      }
      buffer[0] = SOCKS5_VERSION;
      buffer[1] = this.cmd_or_rep;
      buffer[2] = RSV_BUFFER;
      buffer[3] = this.atyp;
      return buffer;
    };

    getCmdOrRep = (): number => {
      return this.cmd_or_rep;
    };

    getTargetPort = (): number => {
      return this.dstPort.readUint16BE();
    };

    getTargetAddr = (): string => {
      return this.dstAddr.toString();
    };
  }

  async function getAddrLength(
      atyp: Uint8Array,
      conn: { read(n?: number): Promise<Buffer> }
  ): Promise<number> {
    switch (atyp[0]) {
      case 0x01:
        return 4;
      case 0x03:
        const length = await conn.read(1);
        return length.readInt8();
      case 0x04:
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
    await conn.read(1);

    const atyp = await conn.read(1);
    const addrLength = await getAddrLength(atyp, conn);

    const dstAddr = await conn.read(addrLength);
    const dstPort = await conn.read(2);
    return new Message(cmd_or_rep[0], atyp[0], addrLength, dstAddr, dstPort);
  }
}
