import { assert } from "chai";
import { TcpSocket } from "../net/socket";
import { createConnection, createServer, parseIP } from "../net/stream";
import { CommandNegotiation, SOCKS5_VERSION } from "../socks/handshake";
import { noAuth } from "../socks/auth/noAuth";
import { Connect } from "../socks/cmd/connect";
import { Server } from "../cmd/server";
import net from "net";

const socksServerIp = "127.0.0.1";
const socksServerPort = 9090;
const echoServerIP = "127.0.0.1";
const echoServerPort = 9099;
const testString = "hello socks";
const testBuffer = Buffer.from(testString);

async function startEchoServer(
  ip: string,
  port: number,
  tcp: boolean = true
): Promise<net.Server> {
  const srv = await createServer(ip, port);
  srv.on("connection", (socket) => {
    socket.on("data", (buffer) => {
      socket.write(buffer);
    });
  });
  return srv;
}

async function startSocksServer(): Promise<Server> {
  const cfg = {
    ip: socksServerIp,
    port: socksServerPort,
    tls: false,
    tlsKeyFile: "",
    tlsCertFile: "",
  };
  const srv = new Server(cfg);
  await srv.start();
  return srv;
}

describe("CONNECT", async () => {
  let echoSrv: net.Server
  let socksSrv: Server
  let socket: TcpSocket

  beforeEach(async () => {
    echoSrv = await startEchoServer(echoServerIP, echoServerPort);
    socksSrv = await startSocksServer();
    socket = new TcpSocket(
      await createConnection(socksServerPort, socksServerIp)
    );
  })

  afterEach(async () => {
    echoSrv.close();
    socksSrv.close();
    socket.close();
  })

  it("noAuth", async () => {
    let reply: Buffer;
    // method
    await socket.write(new Uint8Array([SOCKS5_VERSION, 0x01, 0x00])); // only one method provided
    reply = await socket.read(2);
    assert(reply[0] === SOCKS5_VERSION);
    assert(reply[1] === noAuth.method);

    // command
    const msg = new CommandNegotiation.Message(
      Connect.method,
      0x01,
      4,
      parseIP(echoServerIP),
      echoServerPort
    );
    await socket.write(msg.toBuffer());
    reply = await socket.read();
    assert(reply[0] === SOCKS5_VERSION);
    assert(reply[1] === CommandNegotiation.SUCCEED);

    // echo
    await socket.write(testBuffer);
    reply = await socket.read(testString.length);
    assert(reply.toString() === testString);
  });
});