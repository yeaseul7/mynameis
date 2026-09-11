import * as Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import { WorldScene } from "./scenes/WorldScene";
import type { PlayerSnapshot, Profile } from "./types";

export class PhaserGame {
  private game: Phaser.Game;
  private scene: WorldScene;

  constructor(room: Room, onProfile: (profile: Profile) => void) {
    this.scene = new WorldScene(room, onProfile, () => this.bindRoom(room));
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "phaser-world",
      width: 1000,
      height: 600,
      backgroundColor: "#82bd68",
      scene: this.scene,
      physics: { default: "arcade" },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
  }

  destroy() {
    this.game.destroy(true);
  }

  private bindRoom(room: Room) {
    const callbacks = getStateCallbacks(room);
    callbacks(room.state.players).onAdd((player: unknown, sessionId: string) => {
      const value = player as PlayerSnapshot;
      this.scene.addPlayer(sessionId, value);
      callbacks(player as object).onChange(() => this.scene.updatePlayer(sessionId, value));
    });
    callbacks(room.state.players).onRemove((_player: unknown, sessionId: string) => this.scene.removePlayer(sessionId));
    room.onMessage("chat", ({ sessionId, message }: { sessionId: string; message: string }) => this.scene.showChat(sessionId, message));
  }
}
