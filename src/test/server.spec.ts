import { assert } from "chai";
import { TcpSocket } from "../net/socket";
import { createConnection, createServer, encodeIP } from "../net/stream";
import { CommandNegotiation } from "../protocol/handshake";
import { handler as noAuth } from "../protocol/auth/noAuth";
import { handler as Connect } from "../protocol/command/connect";
import { Agent, AgentMode } from "../agent";
import net from "net";
import * as dgram from "dgram";
import { createSocket } from "../net/dgram";
import { handler as UdpAssociate } from "../protocol/command/udpAssociate";
import readMessage = CommandNegotiation.readMessage;
import { AuthManagement } from "../authManager/authManager";
import { ConnectionManagement } from "../connectionManager";
import {
  IPv4,
  IPv4AddrLen,
  socks5Version,
  succeed,
} from "../protocol/constant";
import { localDatastore } from "../datastore";

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

async function startSocksAgent(): Promise<Agent> {
  const cfg = {
    localIP: socksServerIp,
    localPort: socksServerPort,
    localServerPort: socksServerPort + 1,
    remoteIP: "",
    remotePort: 0,
    commands: ["connect", "udpAssociate", "bind"],
    auths: ["noAuth"],
    mode: "local" as AgentMode,
  };
  const srv = new Agent(
    cfg,
    new AuthManagement(new localDatastore()),
    new ConnectionManagement()
  );
  await srv.start();
  return srv;
}

describe("CONNECT", async () => {
  let echoSrv: net.Server;
  let socksSrv: Agent;
  let socket: TcpSocket;

  beforeEach(async () => {
    echoSrv = await startTcpEchoServer(echoServerIP, echoServerPort);
    socksSrv = await startSocksAgent();
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
    await socket.write(new Uint8Array([socks5Version, 0x01, 0x00])); // only one method provided
    reply = await socket.read(2);
    assert(reply[0] === socks5Version);
    assert(reply[1] === noAuth.method);

    // command
    const msg = new CommandNegotiation.Message(
      Connect.method,
      0x01,
      4,
      encodeIP(echoServerIP),
      echoServerPort
    );
    await socket.write(msg.toBuffer());
    reply = await socket.read();
    assert(reply[0] === socks5Version);
    assert(reply[1] === succeed);

    // echo
    await socket.write(testBuffer);
    reply = await socket.read(testString.length);
    assert(reply.toString() === testString);
  });
});

describe("UDP ASSOCIATE", async () => {
  let echoSrv: dgram.Socket;
  let socksSrv: Agent;
  let socket: TcpSocket;

  beforeEach(async () => {
    echoSrv = await startUdpEchoServer(echoServerIP, echoServerPort);
    socksSrv = await startSocksAgent();
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
    await socket.write(new Uint8Array([socks5Version, 0x01, 0x00])); // only one method provided
    reply = await socket.read(2);
    assert(reply[0] === socks5Version);
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
      IPv4,
      IPv4AddrLen,
      encodeIP(udpClientCfg.ip),
      udpClientCfg.port
    );
    await socket.write(req.toBuffer());
    const rep = await readMessage(socket);
    assert(rep.getCmdOrRep() === succeed);

    // echo
    updSock.send(testString, echoServerPort, echoServerIP);
    await new Promise<void>((resolve, reject) => {
      updSock.once("message", (msg, info) => {
        assert(msg.toString() === testString);
        resolve();
      });
      updSock.once("error", (err) => reject(err));
    });

    updSock.close();
  });
});
