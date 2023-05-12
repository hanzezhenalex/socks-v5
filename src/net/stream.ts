import net from "net";

export class ConnCreateError extends Error {
  constructor(msg: any) {
    super(msg);
  }
}

export var createConnection = async (
  port: number,
  host?: string
): Promise<net.Socket> => {
  const conn = net.createConnection(port, host);
  return new Promise((resolve, reject) => {
    conn.once("connect", () => {
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
  options?: net.ServerOpts
): Promise<net.Server> => {
  const srv = net.createServer(options);
  srv.listen(port, host);
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

function parseIPv4(ip: string): Uint8Array {
  const ret = new Uint8Array(4);
  const subs = ip.split(".", 4);
  for (let i = 0; i < subs.length; i++) {
    ret[i] = Number(subs[i]);
  }
  return ret;
}

function parseIPv6(ip: string): Uint8Array {
  const ret = new Uint8Array(16);
  const nums = ip.split(":", 8);
  for (let i = 0; i < nums.length; i += 2) {
    const group = parseInt(nums[i], 16);
    ret[i] = group >>> 8;
    ret[i + 1] = group & 0xff;
  }
  return ret;
}

export function parseIP(ip: string): Uint8Array {
  const family = net.isIP(ip);

  switch (family) {
    case 4:
      return parseIPv4(ip);
    case 6:
      return parseIPv6(ip);
    default:
      throw new Error("illegal ip family");
  }
}
