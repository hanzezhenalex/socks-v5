const spawn = require("child_process").spawn;
const process = require("process");

const child = spawn(
  "node",
  ["../dist/index.js", "--agent-ip", ":", "--agent-port", "8099"],
  {
    detached: true,
  }
);

console.log(process.pid, child.pid);
process.exit(0);
