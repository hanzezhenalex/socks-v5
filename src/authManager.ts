import { Context } from "./context";

export interface AuthManager {
  verifyUser(ctx: Context, userInfo: UserInfo): Promise<void>;
}

export interface UserInfo {
  password: string;
  username: string;
}

export class AuthManagement {
  async verifyUser(ctx: Context, userInfo: UserInfo): Promise<void> {

  }
}
