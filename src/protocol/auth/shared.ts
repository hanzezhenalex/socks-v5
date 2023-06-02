import { TcpSocket } from "../../net/socket";
import { Context } from "../../context";
import { AuthManager } from "../../authManager";

export interface AuthHandler {
  name: string;
  method: number;
  handle?(ctx: Context, from: TcpSocket, auth: AuthManager): Promise<void>;
}
