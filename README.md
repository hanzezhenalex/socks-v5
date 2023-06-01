# socks-v5
a proxy for socks-v5, support CONNECT/BIND/UDP ASSOCIATE

# Arch
In the design, we'll have two mode, local and cluster. (cluster mode is not support yet)

For local mode, we only deploy one agent in the target server. The agent will proxy the socks request (via TCP connection) and manage auth/resource itself.


For cluster mode, we have three services. 
Agent is installed in the customer machine, handling the protocol and sending requests for permission/proxy. 
Coordinator is deployed in one of our instances, communicating with agents, checking the permission, layoff the requests...
Proxy is deployed in each of our instances which actually transfer the network traffic.


# Usage
## local mode
Build the program first.
```shell
npm run build
```


# reference 
SocksV5 RFC: https://www.rfc-editor.org/rfc/rfc1928
<br>SocksV5 Username/Password Auth: https://www.rfc-editor.org/rfc/rfc1929
<br>Bind & UDP ASSOCIATE: https://www.jianshu.com/p/55c0259d1a36
<br>Nodejs Socket API: https://nodejs.org/api/net.html#class-netsocket
<br>Mocha: https://www.testim.io/blog/mocha-for-typescript-testing/
