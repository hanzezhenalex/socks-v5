import { IContext as CmdContext } from "./socks/cmd/shared";
import { IContext as AuthContext } from "./socks/auth/shared";
import { createConnection } from "./net/stream";
import net from "net";
import { pipe } from "./net/pipe";
import { UserInfo } from "./socks/auth/usrPasswd";

export interface IContext extends CmdContext, AuthContext {
  pipe(sock1: net.Socket, sock2: net.Socket): void;
}

export interface IUserManagement {
  createUserContext(): IContext;
  verifyUser(userInfo: UserInfo): Promise<void>;
}

class Context implements IContext {
  private userService: IUserManagement;
  private userInfo: UserInfo | undefined;

  constructor(userService: IUserManagement) {
    this.userService = userService;
  }

  createConnection = (port: number, host?: string): Promise<net.Socket> => {
    return createConnection(port, host);
  };
  pipe = (sock1: net.Socket, sock2: net.Socket) => {
    pipe(sock1, sock2);
  };
  verifyUser = async (userInfo: UserInfo): Promise<void> => {
    await this.userService.verifyUser(userInfo);
    this.userInfo = userInfo
  };
}

export class UserManagement implements IUserManagement {
  constructor() {}

  createUserContext(): Context {
    return new Context(this);
  }

  verifyUser = async (userInfo: UserInfo): Promise<void> => {
    console.debug(`user ${userInfo.username} ask for verification`)
  };
}
