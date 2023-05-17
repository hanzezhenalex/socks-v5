# socks-v5
a proxy for socks-v5, support CONNECT/BIND/UDP ASSOCIATE

# Usage
Build the program first.
```shell
npm run build
```
Start a standard tcp-based server:
```shell
cd ./dist && node index.js server --server-ip <local-ip> --server-port <local-port>
```
In this mode, client directly connects to socks server via a tcp connection.
<br>If you want tls, then you need to start a socks client locally and a socks server.
```shell
# for client
cd ./dist && node index.js client --server-ip <remote-server-ip> --server-port <remote-server-port> --client-ip <local-client-ip> --client-port <local-client-port>
# for server
cd ./dist && node index.js server --server-ip <local-ip> --server-port <local-port> --tls
```

# reference 
SocksV5 RFC: https://www.rfc-editor.org/rfc/rfc1928
<br>SocksV5 Username/Password Auth: https://www.rfc-editor.org/rfc/rfc1929
<br>Bind & UDP ASSOCIATE: https://www.jianshu.com/p/55c0259d1a36
<br>Nodejs Socket API: https://nodejs.org/api/net.html#class-netsocket
<br>Mocha: https://www.testim.io/blog/mocha-for-typescript-testing/
