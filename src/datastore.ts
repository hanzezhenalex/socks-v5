import { UserInfo } from "./context";

export interface datastore {
  storeUserInfo(user: UserInfo): void;
  getUserInfo(username: string): UserInfo | undefined;
}

export class localDatastore implements datastore {
  private readonly userInfoStore: Map<string, UserInfo>;

  constructor() {
    this.userInfoStore = new Map<string, UserInfo>();
  }

  storeUserInfo(user: UserInfo) {
    this.userInfoStore.set(user.username, user);
  }

  getUserInfo(username: string): UserInfo | undefined {
    return this.userInfoStore.get(username);
  }
}
