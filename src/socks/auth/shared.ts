import { TcpSocket } from "../../net/socket";

export interface IContext {}

export interface IAuthHandler {
  name: string;
  method: number;
  methodReplyCache: Uint8Array;
  handle?(ctx: IContext, from: TcpSocket): Promise<void>;
}
