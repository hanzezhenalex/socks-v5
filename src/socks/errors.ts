import { TcpSocket } from "../net/socket";

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

const NO_ACCEPTABLE_METHODS = new Uint8Array([0x05, 0xff]);

const serverInternalError = 0x01;
const networkUnreachable = 0x03;
const hostUnreachable = 0x04;
const commandNotSupport = 0x07;
const addrTypeNotAllowed = 0x08;

const errorCommandReply = (code: number): Uint8Array => {
  return new Uint8Array([
    0x05,
    code,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
  ]);
};

export const MethodNotSupported = new SocksError(
  "NO ACCEPTABLE METHODS",
  NO_ACCEPTABLE_METHODS
);

export const IncorrectVersion = new SocksError(
  "unknown protocol",
  new Uint8Array()
);
export const CommandNotSupport = new SocksError(
  "Command not supported",
  errorCommandReply(commandNotSupport)
);
export const HostUnreachable = new SocksError(
  "Host unreachable",
  errorCommandReply(hostUnreachable)
);
export const NetworkUnreachable = new SocksError(
  "Network unreachable",
  errorCommandReply(networkUnreachable)
);
export const AddressTypeNotAllowed = new SocksError(
  "Address type not supported",
  errorCommandReply(addrTypeNotAllowed)
);

export const ServerInternalError = errorCommandReply(serverInternalError);
