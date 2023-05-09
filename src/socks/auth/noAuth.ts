const NO_AUTH_RESP = new Uint8Array([0x05, 0x00]);

export var noAuth = {
  method: 0x00,
  methodReplyCache: NO_AUTH_RESP,
};
