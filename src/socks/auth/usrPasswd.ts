import { TcpSocket } from "../../net/socket";
import {SOCKS5_VERSION} from "../handshake";
import {IContext} from "./shared";
import {SocksError} from "../errors";

export interface UserInfo {
  password: string;
  username: string;
}

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

const AUTH_SUCCESS_REPLY = new Uint8Array([SOCKS5_VERSION, 0x00])
const AUTH_FAILURE_REPLY = new Uint8Array([SOCKS5_VERSION, 0x01])

export const AuthenticationFail = new SocksError("Authentication failure", AUTH_FAILURE_REPLY)

const method = 0x02

export var usrPasswd = {
    name: "usrPasswd",
    method: method,
    methodReplyCache: new Uint8Array([SOCKS5_VERSION, method]),
    handle: async (ctx: IContext, from: TcpSocket): Promise<void> => {
        const userInfo = await readReq(from);
        try {
            await ctx.verifyUser(userInfo);
        } catch (e) {
            throw AuthenticationFail
        }
        // +----+--------+
        // |VER | STATUS |
        // +----+--------+
        // | 1  |   1    |
        // +----+--------+
        await from.write(AUTH_SUCCESS_REPLY)
    }
};
