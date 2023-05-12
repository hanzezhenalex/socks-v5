import net, {AddressInfo} from "net";
import { TcpSocket } from "../../net/socket";
import { CommandNegotiation } from "../handshake";
import {parseIP} from "../../net/stream";

export interface IContext {
  createConnection(port: number, host?: string): Promise<net.Socket>;
  getServerAddr(): string;
}

export interface ICommandHandler {
  name: string;
  method: number;
  handler(
    ctx: IContext,
    request: CommandNegotiation.Message,
    from: TcpSocket
  ): Promise<net.Socket>;
}

export async function replySocketAddr(from: TcpSocket, bindAddrInfo: net.AddressInfo) {
  const reply = new CommandNegotiation.Message(
      CommandNegotiation.SUCCEED,
      (bindAddrInfo as AddressInfo).family === "IPv4" ? 0x01 : 0x04,
      (bindAddrInfo as AddressInfo).family === "IPv4" ? 4 : 16,
      parseIP((bindAddrInfo as AddressInfo).address),
      (bindAddrInfo as AddressInfo).port
  );

  await from.write(reply.toBuffer());
}