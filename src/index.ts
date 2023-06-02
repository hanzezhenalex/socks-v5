import { program } from "commander";
import { agentCommand } from "./cmd/agent";

program.addCommand(agentCommand);
program.parse(process.argv);
