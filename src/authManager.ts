import { Context } from "./context";
import { datastore, isAdminUser, UserInfo } from "./datastore";
import crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";

export interface AuthManager {
  fetchAndStoreToken(ctx: Context, username: string, password: string): void;
  fetchToken(username: string, password: string): Promise<string>;
  addUser(ctx: Context, userInfo: UserInfo): void;
  decodeToken(ctx: Context, jwtToken: string): void;
}

const defaultAdminUsername = "admin";
const defaultAdminPassword = "admin123";
const secret = "secret";

export class AuthManagement implements AuthManager {
  private readonly store: datastore;
  private readonly secret: string;

  constructor(
    store: datastore,
    adminUsername: string = defaultAdminUsername,
    adminUserPassword: string = defaultAdminPassword,
    jwtSecret: string = secret
  ) {
    this.secret = jwtSecret;
    this.store = store;
    this.store.storeUserInfo({
      username: adminUsername,
      password: hash(adminUsername, adminUserPassword),
      roles: ["admin"],
    });
  }

  async fetchAndStoreToken(
    ctx: Context,
    username: string,
    password: string
  ): Promise<void> {
    ctx.user = username;
    ctx.token = await this.fetchToken(username, password);
  }

  async fetchToken(username: string, password: string): Promise<string> {
    const user = await this.store.getUserInfo(username);
    if (user === undefined || user.password !== hash(username, password)) {
      throw new Error("incorrect username/password");
    }
    return jwt.sign(
      {
        username: user.username,
      },
      this.secret,
      { expiresIn: "1h" }
    );
  }

  async addUser(ctx: Context, userInfo: UserInfo): Promise<void> {
    if (ctx.user === undefined) {
      throw new Error("unknown user");
    }

    const user = await this.store.getUserInfo(ctx.user);
    if (user === undefined) {
      throw new Error("user not exist");
    }
    if (!isAdminUser(user)) {
      throw new Error("permission denied");
    }

    userInfo.password = hash(userInfo.username, userInfo.password);
    this.store.storeUserInfo(userInfo);
  }

  decodeToken(ctx: Context, jwtToken: string) {
    const decode = jwt.verify(jwtToken, this.secret, {
      complete: false,
    }) as JwtPayload;

    ctx.user = decode.username;
    ctx.token = jwt.sign(
      {
        username: ctx.user,
      },
      this.secret,
      { expiresIn: "1h" }
    );
  }
}

function hash(username: string, password: string): string {
  const md5 = crypto.createHash("md5");
  return md5.update(`${password}:${username}`).digest("hex");
}
