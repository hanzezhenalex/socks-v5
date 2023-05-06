import { Client } from "./proxy/client";

var client = new Client({
    clientIP: "localhost",
    clientPort: 8010,
    serverIP: "localhost",
    serverPort: 8011,
})

client.Start()