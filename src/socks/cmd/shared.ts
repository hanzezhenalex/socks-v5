import net from "net";
import { TcpSocket } from "../../net/socket";
import { CommandNegotiation } from "../handshake";

export interface IContext {
  createConnection(port: number, host?: string): Promise<net.Socket>;
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
