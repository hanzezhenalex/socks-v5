import net, { ServerOpts } from "net";
import { connect, createServer as createTLSServer, TlsOptions } from "tls";

export class ConnCreateError extends Error {
  constructor(msg: any) {
    super(msg);
  }
}

export var createConnection = async (
  port: number,
  host?: string,
  tls: boolean = false
): Promise<net.Socket> => {
  let conn: net.Socket;
  let connectEvent: string;
  if (tls) {
    conn = connect({
      host: host,
      port: port,
      rejectUnauthorized: false,
    });
    connectEvent = "secureConnect";
  } else {
    conn = net.createConnection(port, host);
    connectEvent = "connect";
  }

  return new Promise((resolve, reject) => {
    conn.once(connectEvent, () => {
      resolve(conn);
      conn.removeAllListeners("error");
    });
    conn.once("error", (err) => {
      reject(new ConnCreateError(err));
      conn.removeAllListeners("connect");
    });
  });
};

export var createServer = async (
  host: string,
  port?: number,
  options?: TlsOptions,
  tls: boolean = false
): Promise<net.Server> => {
  let srv: net.Server;

  if (tls && options) {
    srv = createTLSServer(options);
  } else {
    srv = net.createServer(options as ServerOpts);
  }
  if (host === ":") {
    srv.listen(port);
  } else {
    srv.listen(port, host);
  }
  return new Promise((resolve, reject) => {
    srv.once("listening", () => {
      resolve(srv);
      srv.removeAllListeners("error");
    });
    srv.once("error", (err) => {
      reject(new ConnCreateError(err));
      srv.removeAllListeners("connect");
    });
  });
};

export function decodeIPv4(ip: Uint8Array): string {
  let buffer = Buffer.from(ip);
  let ret: string = "";
  for (let i = 0; i < 4; i++) {
    ret += buffer.readUInt8().toString();
    buffer = buffer.subarray(1);
    ret += ".";
  }
  return ret.substring(0, ret.length - 1);
}

function encodeIPv4(ip: string): Uint8Array {
  const ret = new Uint8Array(4);
  const subs = ip.split(".", 4);
  for (let i = 0; i < subs.length; i++) {
    ret[i] = Number(subs[i]);
  }
  return ret;
}

function encodeIPv6(ip: string): Uint8Array {
  const ret = new Uint8Array(16);
  const nums = ip.split(":", 8);
  for (let i = 0; i < nums.length; i += 2) {
    const group = parseInt(nums[i], 16);
    ret[i] = group >>> 8;
    ret[i + 1] = group & 0xff;
  }
  return ret;
}

export function encodeIP(ip: string): Uint8Array {
  const family = net.isIP(ip);

  switch (family) {
    case 4:
      return encodeIPv4(ip);
    case 6:
      return encodeIPv6(ip);
    default:
      throw new Error("illegal ip family");
  }
}
