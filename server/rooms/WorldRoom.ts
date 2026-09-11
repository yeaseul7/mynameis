import { Client, Room } from "colyseus";
import { WorldState } from "../schema/WorldState";
import { Player } from "../schema/Player";

type JoinOptions = { petId?: string; petName?: string };
type MoveMessage = { x?: number; y?: number; direction?: string };
type ChatMessage = { message?: string };

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 600;
const PLAYER_RADIUS = 22;
const DUPLICATE_CODE = 4001;

export class WorldRoom extends Room<WorldState> {
  maxClients = 100;
  private sessionsByPetId = new Map<string, Client>();

  onCreate() {
    this.setState(new WorldState());

    this.onMessage("move", (client, message: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (Number.isFinite(message.x)) player.x = clamp(message.x!, PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS);
      if (Number.isFinite(message.y)) player.y = clamp(message.y!, PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS);
      if (["up", "down", "left", "right"].includes(message.direction ?? "")) {
        player.direction = message.direction!;
      }
    });

    this.onMessage("chat", (client, payload: ChatMessage) => {
      const player = this.state.players.get(client.sessionId);
      const message = payload.message?.trim().slice(0, 80);
      if (!player || !message) return;
      this.broadcast("chat", { sessionId: client.sessionId, message });
    });
  }

  onAuth(_client: Client, options: JoinOptions) {
    const petId = options.petId?.trim();
    const petName = options.petName?.trim();
    if (!petId || !petName || petId.length > 40 || petName.length > 20) return false;
    return { petId, petName };
  }

  onJoin(client: Client, _options: JoinOptions, auth: { petId: string; petName: string }) {
    const previous = this.sessionsByPetId.get(auth.petId);
    if (previous && previous.sessionId !== client.sessionId) {
      previous.send("duplicate-session", { message: "다른 기기 또는 브라우저에서 접속되어 연결이 종료되었습니다." });
      previous.leave(DUPLICATE_CODE, "duplicate petId");
    }

    const player = new Player();
    player.userId = client.sessionId;
    player.petId = auth.petId;
    player.petName = auth.petName;
    player.x = 100 + Math.random() * 800;
    player.y = 100 + Math.random() * 400;
    this.state.players.set(client.sessionId, player);
    this.sessionsByPetId.set(auth.petId, client);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player && this.sessionsByPetId.get(player.petId)?.sessionId === client.sessionId) {
      this.sessionsByPetId.delete(player.petId);
    }
    this.state.players.delete(client.sessionId);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
