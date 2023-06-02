import { TcpSocket } from "../net/socket";
import {
  addrTypeNotAllowed,
  commandNotSupport,
  hostUnreachable,
  IPv4,
  networkUnreachable,
  noAcceptableMethods,
  serverInternalError,
  socks5Version,
} from "./constant";

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

function NewCommandError(code: number, msg: string): SocksError {
  return new SocksError(
    msg,
    new Uint8Array([
      socks5Version, // version
      code, // rep
      0x00, // rsv
      IPv4, // addr type
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
  new Uint8Array([socks5Version, noAcceptableMethods])
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
