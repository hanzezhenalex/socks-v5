# socks-v5
a proxy for socks-v5, support CONNECT/BIND/UDP ASSOCIATE

# Arch
In the design, we'll have two mode, local and cluster. (cluster mode is not support yet)
<p align="center">
    <img src="https://github.com/hanzezhenalex/socks-v5/blob/main/docs/fig/local%20mode.png?raw=true" align="center">
<\p>

For local mode, we only deploy one agent in the target server. The agent will proxy the socks request (via TCP connection) and manage auth/resources itself.

<img src="https://github.com/hanzezhenalex/socks-v5/blob/main/docs/fig/cluster%20mode.png?raw=true">

For cluster mode, we have three services. 
Agent is installed in the customer machine, handling the protocol and sending requests for permission/proxy. 
Coordinator is deployed in one of our instances, communicating with agents, checking the permission, control the resources.
Proxy is deployed in each of our instances which actually transfer the network traffic.


# Usage
## local mode
Build the program first.
```shell
npm run build
```
Run agent
```shell
node ./dist/index.js agent
```
Run agent help to see more details
```shell
node ./dist/index.js agent --help
```


# reference 
SocksV5 RFC: https://www.rfc-editor.org/rfc/rfc1928
<br>SocksV5 Username/Password Auth: https://www.rfc-editor.org/rfc/rfc1929
<br>Bind & UDP ASSOCIATE: https://www.jianshu.com/p/55c0259d1a36
<br>Nodejs Socket API: https://nodejs.org/api/net.html#class-netsocket
<br>Mocha: https://www.testim.io/blog/mocha-for-typescript-testing/
