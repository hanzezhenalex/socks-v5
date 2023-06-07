type Role = "admin" | "user";

export interface UserInfo {
  username: string;
  password: string;
  roles: Role[];
}

export function isAdminUser(user: UserInfo): boolean {
  return user.roles.indexOf("admin") !== -1;
}

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
