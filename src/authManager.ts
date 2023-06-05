import { Context, UserInfo } from "./context";
import { datastore } from "./datastore";
import crypto from "crypto";

export interface AuthManager {
  init(): void;
  verifyUser(ctx: Context, userInfo: UserInfo): void;
  addUser(ctx: Context, userInfo: UserInfo): void;
}

const adminUsername = "admin";
const adminPassword = "admin123";

export class AuthManagement implements AuthManager {
  private readonly admin: UserInfo;
  private readonly store: datastore;

  constructor(
    store: datastore,
    username: string = adminUsername,
    password: string = adminPassword
  ) {
    this.admin = {
      username: username,
      password: password,
    };
    this.store = store;
  }

  async init() {
    await this.addUser(
      { serverAddr: "", user: this.admin.username },
      this.admin
    );
  }

  async verifyUser(ctx: Context, userInfo: UserInfo): Promise<void> {
    const user = await this.store.getUserInfo(userInfo.username);
    if (user === undefined) {
      throw new Error("user not exist");
    }
    if (user.password !== hash(userInfo)) {
      throw new Error("incorrect username/password");
    }
    ctx.user = user.username;
  }

  async addUser(ctx: Context, userInfo: UserInfo): Promise<void> {
    this.store.storeUserInfo({
      username: userInfo.username,
      password: hash(userInfo),
    });
  }
}

function hash(user: UserInfo): string {
  const md5 = crypto.createHash("md5");
  return md5.update(`${user.password}:${user.username}`).digest("hex");
}
