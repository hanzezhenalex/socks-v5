import { program } from "commander";

const clientCommand = program.command("client");

clientCommand
  .requiredOption("--server-ip <value>", "socks5 server ip")
  .option("--server-port <value>", "socks5 server port", "1080")
  .option("--client-ip <value>", "client ip", "localhost")
  .option("--client-port <value>", "client port", "1080")
  .action(async (options, command) => {
    const clientPort = Number(options.clientPort);
    const serverPort = Number(options.serverPort);
    const cfg = {
      clientIP: options.clientIp,
      clientPort: clientPort,
      serverIP: options.serverIp,
      serverPort: serverPort,
    };
    console.log(`client started. cfg=${JSON.stringify(cfg)}`);
  });

const serverCommand = program.command("server");
serverCommand
  .requiredOption("--server-ip <value>", "socks5 server ip")
  .option("--server-port <value>", "socks5 server port", "1080")
  .option("--tls", "use tls", false)
  .option("--tls-key-file <value>", "tls key file path", "../cert/key.pem")
  .option("--tls-cert-file <value>", "tls pem file path", "../cert/cert.pem")
  .action(async (options, command) => {
    const serverPort = Number(options.serverPort);
    const cfg = {
      ip: options.serverIp,
      port: serverPort,
      tls: options.tls,
      tlsKeyFile: options.tlsKeyFile,
      tlsCertFile: options.tlsCertFile,
    };
    console.log(`server started. cfg=${JSON.stringify(cfg)}`);
  });

program.parse(process.argv);
