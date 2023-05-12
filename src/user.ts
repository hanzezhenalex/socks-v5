import { IContext as CmdContext } from "./socks/cmd/shared";
import { IContext as AuthContext } from "./socks/auth/shared";
import { createConnection } from "./net/stream";
import net from "net";
import { pipe } from "./net/pipe";

export interface IContext extends CmdContext, AuthContext {
  pipe(sock1: net.Socket, sock2: net.Socket): void;
}

export interface IUserManagement {
  createUserContext(): IContext;
}

class Context implements IContext {
  constructor() {}

  createConnection = (port: number, host?: string): Promise<net.Socket> => {
    return createConnection(port, host);
  };
  pipe = (sock1: net.Socket, sock2: net.Socket) => {
    pipe(sock1, sock2);
  };
}

export class UserManagement implements IUserManagement {
  constructor() {}

  createUserContext(): Context {
    return new Context();
  }
}
