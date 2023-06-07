import { TcpSocket } from "../../net/socket";
import { SocksError } from "../errors";
import { AuthManager } from "../../authManager/authManager";
import { Context } from "../../context";
import { socks5Version } from "../constant";

// +----+------+----------+------+----------+
// |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
// +----+------+----------+------+----------+
// | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
// +----+------+----------+------+----------+
export async function readReq(
  from: TcpSocket
): Promise<{ username: string; password: string }> {
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
    const { username, password } = await readReq(from);
    try {
      await auth.fetchAndStoreToken(ctx, username, password);
    } catch (e) {
      throw new SocksError(
        `Authentication failure, err=${(e as Error).message}`,
        new Uint8Array([socks5Version, AuthenticationFail])
      );
    }
    // +----+--------+
    // |VER | STATUS |
    // +----+--------+
    // | 1  |   1    |
    // +----+--------+
    await from.write(new Uint8Array([socks5Version, AuthenticationSuccess]));
  },
};
