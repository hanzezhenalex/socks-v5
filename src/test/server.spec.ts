import { assert } from "chai";
import { TcpSocket } from "../net/socket";
import { createConnection, createServer, parseIP } from "../net/stream";
import { CommandNegotiation, SOCKS5_VERSION } from "../socks/handshake";
import { noAuth } from "../socks/auth/noAuth";
import { Connect } from "../socks/cmd/connect";
import { Server } from "../cmd/server";
import net from "net";
import * as dgram from "dgram";
import { createSocket } from "../net/dgram";
import { UdpAssociate } from "../socks/cmd/udpAssociate";
import readMessage = CommandNegotiation.readMessage;
import SUCCEED = CommandNegotiation.SUCCEED;

const socksServerIp = "127.0.0.1";
const socksServerPort = 9090;
const echoServerIP = "127.0.0.1";
const echoServerPort = 9099;
const testString = "hello socks";
const testBuffer = Buffer.from(testString);

async function startTcpEchoServer(
  ip: string,
  port: number
): Promise<net.Server> {
  const srv = await createServer(ip, port);
  srv.on("connection", (socket) => {
    socket.on("data", (buffer) => {
      socket.write(buffer);
    });
  });
  return srv;
}

async function startUdpEchoServer(
  ip: string,
  port: number
): Promise<dgram.Socket> {
  const socket = await createSocket(ip, port);
  socket.on("message", async (msg, info) => {
    socket.send(msg, info.port, info.address);
  });
  return socket;
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
  let echoSrv: net.Server;
  let socksSrv: Server;
  let socket: TcpSocket;

  beforeEach(async () => {
    echoSrv = await startTcpEchoServer(echoServerIP, echoServerPort);
    socksSrv = await startSocksServer();
    socket = new TcpSocket(
      await createConnection(socksServerPort, socksServerIp)
    );
  });

  afterEach(async () => {
    echoSrv.close();
    socksSrv.close();
    socket.close();
  });

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

describe("UDP ASSOCIATE", async () => {
  let echoSrv: dgram.Socket;
  let socksSrv: Server;
  let socket: TcpSocket;

  beforeEach(async () => {
    echoSrv = await startUdpEchoServer(echoServerIP, echoServerPort);
    socksSrv = await startSocksServer();
    socket = new TcpSocket(
      await createConnection(socksServerPort, socksServerIp)
    );
  });

  afterEach(() => {
    echoSrv.close();
    socksSrv.close();
    socket.close();
  });

  it("udp associate", async () => {
    let reply: Buffer;
    // method
    await socket.write(new Uint8Array([SOCKS5_VERSION, 0x01, 0x00])); // only one method provided
    reply = await socket.read(2);
    assert(reply[0] === SOCKS5_VERSION);
    assert(reply[1] === noAuth.method);

    // command
    const udpClientCfg = {
      ip: "127.0.0.1",
      port: 9098,
    };
    const updSock = dgram.createSocket("udp4");
    updSock.bind({
      port: udpClientCfg.port,
      address: udpClientCfg.ip,
    });

    const req = new CommandNegotiation.Message(
      UdpAssociate.method,
      0x01,
      4,
      parseIP(udpClientCfg.ip),
      udpClientCfg.port
    );
    await socket.write(req.toBuffer());
    const rep = await readMessage(socket);
    assert(rep.getCmdOrRep() === SUCCEED);

    // echo
    updSock.send(testString, echoServerPort, echoServerIP);
    updSock.once("message", (msg, info) => {
      assert(msg.toString() === testString);
    });

    updSock.close();
  });
});
