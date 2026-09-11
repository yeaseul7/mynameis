import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./rooms/WorldRoom";

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(cors());
app.get("/health", (_request, response) => response.json({ ok: true }));

const httpServer = createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define("world", WorldRoom);

httpServer.listen(port, () => {
  console.log(`Colyseus server: ws://localhost:${port}`);
});
