export interface UserInfo {
  password: string;
  username: string;
}

export interface Context {
  serverAddr: string;
  user: string | undefined;
}
