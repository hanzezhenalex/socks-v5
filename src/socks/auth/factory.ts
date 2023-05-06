import { noAuth } from "./noAuth";

export const NO_ACCEPTABLE_METHODS = new Uint8Array([0x05, 0xff]);

interface IAuthMethod {
  method: number;
  methodReplyCache: Uint8Array;
  clientHandler?: Function;
  serverHandler?: Function;
}

var auth_methods: IAuthMethod[] = [noAuth];

export function selectAuthMethod(supported: number[]): IAuthMethod | null {
  for (var i = 0; i < auth_methods.length; i++) {
    if (supported.find((val) => val === auth_methods[i].method)) {
      return auth_methods[i];
    }
  }
  return null;
}

export function getAuthHandler(method: number) : IAuthMethod | null {
  for (var i = 0; i < auth_methods.length; i++) {
    if (auth_methods[i],method === method ) {
      return auth_methods[i]
    }
  }
  return null
}


