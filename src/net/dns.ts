import dns from "dns";

export class DnsError extends Error {
  constructor(msg: any) {
    super(msg);
  }
}

export function dnsLoopUp(host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.lookup(host, (err, addr) => {
      err ? reject(new DnsError(err)) : resolve(addr);
    });
  });
}