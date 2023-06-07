import { Command } from "commander";
import { Agent, AgentMode, clusterMode, localMode } from "../agent";
import { AuthManagement } from "../authManager/authManager";
import { ConnectionManagement } from "../connectionManager";
import { localDatastore } from "../datastore";

export const agentCommand = new Command("agent");

agentCommand
  .option("--remote-ip <value>", "socks5 server ip")
  .option("--remote-port <value>", "socks5 server port", "1080")
  .option("--agent-ip <value>", "agent ip", "localhost")
  .option("--agent-port <value>", "agent port", "1080")
  .option("--agent-server-port <value>", "agent port", "1081")
  .option("--mode <value>", "agent mode", "local")
  .option("--tls-key <value>", "agent mode", "./cert/key.pem")
  .option("--tls-cert <value>", "agent mode", "./cert/cert.pem")
  .option(
    "--commands <value...>",
    "supported commands, connect|bind|udpAssociate",
    ["connect"]
  )
  .option("--auth <value...>", "supported auth methods, noAuth|usrPasswd", [
    "noAuth",
    "usrPasswd",
  ])
  .action(async (options, command) => {
    let mode: AgentMode;
    switch (options.mode) {
      case localMode:
        mode = localMode;
        break;
      case clusterMode:
        mode = clusterMode;
        throw new Error("cluster mode not implement yet");
      default:
        throw new Error("invalid mode");
    }

    const agent = new Agent(
      {
        localIP: options.agentIp,
        localPort: Number(options.agentPort),
        localServerPort: options.agentServerPort,
        remoteIP: options.serverIp,
        remotePort: Number(options.serverPort),
        commands: options.commands,
        auths: options.auth,
        mode: mode,
        tlsKey: options.tlsKey,
        tlsCert: options.tlsCert,
      },
      new AuthManagement(new localDatastore()),
      new ConnectionManagement()
    );
    await agent.start();
  });
