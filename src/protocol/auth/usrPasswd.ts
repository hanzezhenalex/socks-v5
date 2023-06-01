import { TcpSocket } from "../../net/socket";
import { Socks5Version } from "../handshake";
import { SocksError } from "../errors";
import { AuthManager, UserInfo } from "../../authManager";
import { Context } from "../../context";

// +----+------+----------+------+----------+
// |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
// +----+------+----------+------+----------+
// | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
// +----+------+----------+------+----------+
export async function readReq(from: TcpSocket): Promise<UserInfo> {
  await from.read(1);
  const username = await from.read((await from.read(1))[0]);
  const password = await from.read((await from.read(1))[0]);
  return { username: username.toString(), password: password.toString() };
}

export const AuthenticationSuccess = 0x00;
export const AuthenticationFail = 0x01;

export var handler = {
  name: "usrPasswd",
  method: 0x02,
  handle: async (
    ctx: Context,
    from: TcpSocket,
    auth: AuthManager
  ): Promise<void> => {
    const userInfo = await readReq(from);
    try {
      await auth.verifyUser(ctx, userInfo);
    } catch (e) {
      throw new SocksError(
        `Authentication failure, err=${(e as Error).message}`,
        new Uint8Array([Socks5Version, AuthenticationFail])
      );
    }
    // +----+--------+
    // |VER | STATUS |
    // +----+--------+
    // | 1  |   1    |
    // +----+--------+
    await from.write(new Uint8Array([Socks5Version, AuthenticationSuccess]));
  },
};
