import { TcpSocket } from "../net/socket";
import { Socks5Version } from "./handshake";

export class SocksError extends Error {
  private readonly msgToSend: Uint8Array;
  constructor(msg: any, msgToSend: Uint8Array) {
    super(msg);
    this.msgToSend = msgToSend;
  }

  async handle(from: TcpSocket) {
    if (from._sock.writable && this.msgToSend.length > 0) {
      await from.write(this.msgToSend);
    }
  }
}

export const noAcceptableMethods = 0xff;

export const serverInternalError = 0x01;
export const networkUnreachable = 0x03;
export const hostUnreachable = 0x04;
export const commandNotSupport = 0x07;
export const addrTypeNotAllowed = 0x08;

function NewCommandError(code: number, msg: string): SocksError {
  return new SocksError(
    msg,
    new Uint8Array([
      Socks5Version,
      code,
      0x00, // rsv
      0x00, // addr type
      0x00, // dst.host
      0x00,
      0x00,
      0x00,
      0x00, // dst.port
      0x00,
    ])
  );
}

export const NoAcceptableMethods = new SocksError(
  "NO ACCEPTABLE METHODS",
  new Uint8Array([Socks5Version, noAcceptableMethods])
);

export const IncorrectVersion = new SocksError(
  "unknown protocol",
  new Uint8Array()
);
export const CommandNotSupport = NewCommandError(
  commandNotSupport,
  "Command not supported"
);
export const HostUnreachable = NewCommandError(
  hostUnreachable,
  "Host unreachable"
);
export const NetworkUnreachable = NewCommandError(
  networkUnreachable,
  "Network unreachable"
);
export const AddressTypeNotAllowed = NewCommandError(
  addrTypeNotAllowed,
  "Address type not supported"
);

export const ServerInternalError = NewCommandError(
  serverInternalError,
  "general SOCKS server failure"
);
