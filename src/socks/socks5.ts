import { SocketPromise } from "../net/socket";

export const SOCKS5_VERSION = 0x05;
export const RSV_BUFFER = 0x00;

export const CMD_NOT_ALLOWED_RESP = new Uint8Array([
  0x05, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

export const ERRORS = {
  ERROR_CMD_NOT_ALLOWED: new Error("Command Not Supported"),
};

export enum STAGE {
  PREPARING = 0,
  METHOD_SELECTION = 1,
  AUTHENTICATION = 2,
  ADDRESSING = 3,
  PIPING = 4,
}

export namespace MethodSelection {
  export class Request {
    private methods: Uint8Array;

    constructor(methods: Uint8Array) {
      this.methods = methods;
    }

    getMethod = (): number[] => {
      var ret: number[] = [];
      for (var i = 0; i < this.methods.length; i++) {
        ret.push(this.methods[i]);
      }
      return ret;
    };

    toBuffer = (): Uint8Array => {
      var buffer = new Uint8Array(2 + this.methods.length);
      buffer[0] = SOCKS5_VERSION;
      buffer[1] = this.methods.length;
      for (var i = 0, j = 2; i < this.methods.length; i++, j++) {
        buffer[j] = this.methods[i];
      }
      return buffer;
    };
  }

  export async function readReq(__sock: SocketPromise): Promise<Request> {
    // +----+----------+----------+
    // |VER | NMETHODS | METHODS  |
    // +----+----------+----------+
    // | 1  |    1     | 1 to 255 |
    // +----+----------+----------+
    await __sock.read(1);
    var n_methods = await __sock.read(1);
    var methods = await __sock.read(n_methods.readInt8());
    return new Request(methods);
  }

  export class Reply {
    private method: number;

    constructor(method: number) {
      this.method = method;
    }

    getMethod = (): number => {
      return this.method;
    };

    toBuffer = (): Uint8Array => {
      var buffer = new Uint8Array(2);
      buffer[0] = SOCKS5_VERSION;
      buffer[1] = this.method;
      return buffer;
    };
  }

  export async function readReply(conn: SocketPromise) {
    // +----+--------+
    // |VER | METHOD |
    // +----+--------+
    // | 1  |   1    |
    // +----+--------+
    await conn.read(1);
    var method = await conn.read(1);
    return new Reply(method[0]);
  }
}

export namespace Addressing {
  export const SUCCEED = 0x00;
  export const SERVER_INTERNAL_ERROR = new Uint8Array([
    0x05, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);

  class Message {
    private __cmd_or_rep: Uint8Array;
    private __atyp: Uint8Array;
    private __addrLength: number;
    private __dstAddr: Uint8Array;
    private __dstPort: Buffer;

    constructor(
      cmd_or_rep: Uint8Array,
      atyp: Uint8Array,
      addrLength: number,
      dstAddr: Uint8Array,
      dstPort: Buffer
    ) {
      this.__cmd_or_rep = cmd_or_rep;
      this.__atyp = atyp;
      this.__addrLength = addrLength;
      this.__dstAddr = dstAddr;
      this.__dstPort = dstPort;
    }

    needDnsLookUp = (): boolean => {
      return this.__atyp[0] === 0x03;
    };

    toBuffer = (): Uint8Array => {
      var buffer: Uint8Array;
      switch (this.__atyp[0]) {
        case 0x01:
          buffer = new Uint8Array(3 + 1 + 4 + 2);
          for (var i = 4, j = 0; j < 4; i++, j++) {
            buffer[i] = this.__dstAddr[j];
          }
          buffer[8] = this.__dstPort[0];
          buffer[9] = this.__dstPort[1];
          break;
        case 0x03:
          buffer = new Uint8Array(3 + 1 + 1 + this.__addrLength + 2);
          buffer[4] = this.__addrLength;
          var i = 5;
          for (var j = 0; j < this.__addrLength; i++, j++) {
            buffer[i] = this.__dstAddr[j];
          }
          buffer[i] = this.__dstPort[0];
          buffer[i + 1] = this.__dstPort[1];
          break;
        case 0x04:
          buffer = new Uint8Array(3 + 1 + 16 + 2);
          for (var i = 4, j = 0; j < 16; i++, j++) {
            buffer[i] = this.__dstAddr[j];
          }
          buffer[20] = this.__dstPort[0];
          buffer[21] = this.__dstPort[1];
          break;
        default:
          throw new Error("Unknown addr type");
      }
      buffer[0] = SOCKS5_VERSION;
      buffer[1] = this.__cmd_or_rep[0];
      buffer[2] = RSV_BUFFER;
      buffer[3] = this.__atyp[0];
      return buffer;
    };

    getCmdOrRep = (): number => {
      return this.__cmd_or_rep[0];
    };

    getTargetPort = (): number => {
      return this.__dstPort.readUint16BE();
    };

    getTargetAddr = (): string => {
      return this.__dstAddr.toString();
    };
  }

  export async function readMessage(conn: SocketPromise): Promise<Message> {
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
    var cmd_or_rep = await conn.read(1);
    await conn.read(1);

    var atyp = await conn.read(1);
    var addrLength = await getAddrLength(atyp, conn);

    var dstAddr = await conn.read(addrLength);
    var dstPort = await conn.read(2);
    return new Message(cmd_or_rep, atyp, addrLength, dstAddr, dstPort);
  }
}

export async function getAddrLength(
  atyp: Uint8Array,
  conn: SocketPromise
): Promise<number> {
  switch (atyp[0]) {
    case 0x01:
      return 1;
    case 0x03:
      var length = await conn.read(1);
      return length.readInt8();
    case 0x04:
      return 16;
    default:
      return Promise.reject("Unknown addr type");
  }
}
