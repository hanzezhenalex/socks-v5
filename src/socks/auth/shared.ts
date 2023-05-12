import { TcpSocket } from "../../net/socket";
import {UserInfo} from "./usrPasswd";

export interface IContext {
  verifyUser(userInfo: UserInfo): Promise<void>
}

export interface IAuthHandler {
  name: string;
  method: number;
  methodReplyCache: Uint8Array;
  handle?(ctx: IContext, from: TcpSocket): Promise<void>;
}
