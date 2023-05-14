import udp from "dgram";
import { ConnCreateError } from "./stream";

export var createSocket = (
  host: string,
  port?: number
): Promise<udp.Socket> => {
  const socket = udp.createSocket("udp4");
  socket.bind({
    address: host,
    port: port,
  });
  return new Promise((resolve, reject) => {
    socket.once("listening", () => {
      resolve(socket);
      socket.removeAllListeners("error")
    });
    socket.once("error", (err) => {
      reject(new ConnCreateError(err));
    });
  });
};
