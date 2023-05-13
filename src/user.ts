import { Connection, IContext as CmdContext } from "./socks/cmd/shared";
import { IContext as AuthContext } from "./socks/auth/shared";
import { createConnection } from "./net/stream";
import net from "net";
import { pipe } from "./net/pipe";
import { UserInfo } from "./socks/auth/usrPasswd";
import { Config } from "./cmd/server";
import * as dgram from "dgram";

export interface IContext extends CmdContext, AuthContext {
  pipe(conn1: net.Socket, conn2: Connection): void;
}

export interface IUserManagement {
  createUserContext(): IContext;
  verifyUser(userInfo: UserInfo): Promise<void>;
}

class Context implements IContext {
  private userService: IUserManagement;
  private userInfo: UserInfo | undefined;
  private cfg: Config;

  constructor(userService: IUserManagement, cfg: Config) {
    this.userService = userService;
    this.cfg = cfg;
  }

  getServerAddr = (): string => {
    return this.cfg.ip;
  };

  createConnection = (port: number, host?: string): Promise<net.Socket> => {
    return createConnection(port, host);
  };

  pipe(conn1: net.Socket, conn2: Connection) {
    if (conn2.socket as net.Socket) {
      pipe(conn1, conn2.socket as net.Socket);
      return;
    }
    const socket = conn2.socket as dgram.Socket;
    socket.on("message", conn2.onMessage ? conn2.onMessage : () => {});
    socket.on("error", (err) => {
      console.error(err);
      conn1.end();
    });
    conn1.on("end", () => socket.close());
    conn1.on("error", (err) => {
      console.error(err);
      socket.close();
    });
  }

  verifyUser = async (userInfo: UserInfo): Promise<void> => {
    await this.userService.verifyUser(userInfo);
    this.userInfo = userInfo;
  };
}

export class UserManagement implements IUserManagement {
  private readonly cfg: Config;
  constructor(cfg: Config) {
    this.cfg = cfg;
  }

  createUserContext(): Context {
    return new Context(this, this.cfg);
  }

  verifyUser = async (userInfo: UserInfo): Promise<void> => {
    console.debug(`user ${userInfo.username} ask for verification`);
  };
}
