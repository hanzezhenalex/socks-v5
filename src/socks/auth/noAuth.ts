import { SOCKS5_VERSION } from "../handshake";

export var noAuth = {
  name: "noAuth",
  method: 0x00,
  methodReplyCache: new Uint8Array([SOCKS5_VERSION, 0x00]),
};
