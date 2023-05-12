#!/bin/bash

set -x 

# In curl >= 7.18.0, use
# curl http://www.baidu.com --socks5-hostname localhost:8010

# In curl >= 7.21.7, use
curl http://www.baidu.com -x socks5h://localhost:8010

# for username/password, use
# curl http://www.baidu.com -x socks5h://username:password@localhost:8010
