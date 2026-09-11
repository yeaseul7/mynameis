import * as Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { PlayerSnapshot, Profile } from "../types";

type PlayerView = {
  body: Phaser.GameObjects.Container;
  bubble?: Phaser.GameObjects.Container;
  targetX: number;
  targetY: number;
  direction: string;
};

export class WorldScene extends Phaser.Scene {
  private players = new Map<string, PlayerView>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private lastSentAt = 0;
  private lastSentX = 0;
  private lastSentY = 0;

  constructor(
    private room: Room,
    private onProfile: (profile: Profile) => void,
    private onReady: () => void,
  ) { super("world"); }

  create() {
    this.drawPark();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({ up: "W", down: "S", left: "A", right: "D" }) as typeof this.wasd;
    this.onReady();
  }

  addPlayer(sessionId: string, player: PlayerSnapshot) {
    if (this.players.has(sessionId)) return;
    const color = sessionId === this.room.sessionId ? 0xffca54 : colorFromId(player.petId);
    const shadow = this.add.ellipse(0, 18, 46, 15, 0x53466d, 0.2);
    const bodyShape = this.add.rectangle(0, 7, 38, 31, color).setStrokeStyle(4, 0x51465e);
    const head = this.add.rectangle(0, -10, 42, 35, color).setStrokeStyle(4, 0x51465e);
    const earLeft = this.add.rectangle(-20, -14, 12, 24, 0x9b6a55).setStrokeStyle(3, 0x51465e).setAngle(-12);
    const earRight = this.add.rectangle(20, -14, 12, 24, 0x9b6a55).setStrokeStyle(3, 0x51465e).setAngle(12);
    const face = this.add.text(0, -8, "• ᴥ •", { fontFamily: "monospace", fontSize: "14px", color: "#43394e", fontStyle: "bold" }).setOrigin(0.5);
    const collar = this.add.rectangle(0, 5, 30, 5, 0xff6685).setStrokeStyle(2, 0x51465e);
    const name = this.add.text(0, -47, player.petName, { fontFamily: "monospace", fontSize: "15px", color: "#453a52", fontStyle: "bold", backgroundColor: "#fff9f0", padding: { x: 7, y: 4 }, stroke: "#fff9f0", strokeThickness: 1 }).setOrigin(0.5);
    const body = this.add.container(player.x, player.y, [shadow, bodyShape, head, earLeft, earRight, face, collar, name]).setSize(56, 72).setDepth(6);
    body.setInteractive({ useHandCursor: sessionId !== this.room.sessionId });
    if (sessionId !== this.room.sessionId) body.on("pointerdown", () => this.onProfile({ petId: player.petId, petName: player.petName }));
    this.players.set(sessionId, { body, targetX: player.x, targetY: player.y, direction: player.direction });
    if (sessionId === this.room.sessionId) { this.lastSentX = player.x; this.lastSentY = player.y; }
  }

  updatePlayer(sessionId: string, player: PlayerSnapshot) {
    const view = this.players.get(sessionId);
    if (!view) return;
    view.targetX = player.x;
    view.targetY = player.y;
    view.direction = player.direction;
  }

  removePlayer(sessionId: string) {
    const view = this.players.get(sessionId);
    view?.bubble?.destroy();
    view?.body.destroy();
    this.players.delete(sessionId);
  }

  showChat(sessionId: string, message: string) {
    const view = this.players.get(sessionId);
    if (!view) return;
    view.bubble?.destroy();
    const text = this.add.text(0, 0, `♬ ${message}`, { fontFamily: "monospace", fontSize: "14px", color: "#51465e", backgroundColor: "#fffdf7", padding: { x: 10, y: 7 }, stroke: "#fffdf7", strokeThickness: 1, wordWrap: { width: 180 } }).setOrigin(0.5, 1);
    const bubble = this.add.container(view.body.x, view.body.y - 54, [text]).setDepth(10);
    view.bubble = bubble;
    this.time.delayedCall(4000, () => { if (view.bubble === bubble) view.bubble = undefined; bubble.destroy(); });
  }

  update(time: number, delta: number) {
    const local = this.players.get(this.room.sessionId);
    if (!local) return;
    const seconds = delta / 1000;
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx--;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx++;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy--;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy++;
    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      local.body.x = Phaser.Math.Clamp(local.body.x + dx / length * 180 * seconds, 22, 978);
      local.body.y = Phaser.Math.Clamp(local.body.y + dy / length * 180 * seconds, 22, 578);
      local.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
      if (time - this.lastSentAt >= 50 && Math.hypot(local.body.x - this.lastSentX, local.body.y - this.lastSentY) >= 1) {
        this.room.send("move", { x: local.body.x, y: local.body.y, direction: local.direction });
        this.lastSentAt = time; this.lastSentX = local.body.x; this.lastSentY = local.body.y;
      }
    }
    for (const [id, view] of this.players) {
      if (id !== this.room.sessionId) {
        view.body.x = Phaser.Math.Linear(view.body.x, view.targetX, 0.18);
        view.body.y = Phaser.Math.Linear(view.body.y, view.targetY, 0.18);
      }
      if (view.bubble) { view.bubble.x = view.body.x; view.bubble.y = view.body.y - 54; view.bubble.scaleX = 1; }
    }
  }

  private drawPark() {
    const graphics = this.add.graphics();

    // 보라매공원의 넓은 녹지와 중앙 대운동장을 단순화한 배치다.
    graphics.fillStyle(0xd9ecff).fillRect(0, 0, 1000, 600);
    graphics.fillStyle(0xa9d989).fillRoundedRect(12, 12, 976, 576, 28);
    graphics.lineStyle(6, 0x655875, 1).strokeRoundedRect(12, 12, 976, 576, 28);

    // 잔디에 작은 격자 무늬를 넣어 미니룸 바닥 같은 느낌을 만든다.
    graphics.lineStyle(1, 0x8fc779, 0.35);
    for (let x = 28; x < 990; x += 32) graphics.lineBetween(x, 18, x, 582);
    for (let y = 28; y < 590; y += 32) graphics.lineBetween(18, y, 982, y);

    // 외곽 순환 산책로와 공원을 가로지르는 주요 보행로.
    graphics.lineStyle(42, 0x897b98, 0.35);
    graphics.strokeRoundedRect(38, 38, 924, 524, 105);
    graphics.lineStyle(34, 0xffe6bb, 1);
    graphics.strokeRoundedRect(38, 38, 924, 524, 105);
    graphics.lineStyle(36, 0x897b98, 0.35);
    graphics.lineBetween(55, 355, 945, 355);
    graphics.lineBetween(705, 55, 705, 545);
    graphics.lineStyle(28, 0xffe6bb, 1);
    graphics.lineBetween(55, 355, 945, 355);
    graphics.lineBetween(705, 55, 705, 545);

    // 중앙 대운동장과 러닝 트랙.
    graphics.fillStyle(0x655875, 0.35).fillRoundedRect(274, 110, 403, 222, 104);
    graphics.fillStyle(0xe79091).fillRoundedRect(278, 105, 395, 220, 104);
    graphics.fillStyle(0xffc7ad).fillRoundedRect(289, 116, 373, 198, 94);
    graphics.lineStyle(3, 0xf2ead1, 0.9);
    graphics.strokeRoundedRect(300, 127, 351, 176, 84);
    graphics.fillStyle(0xaee17f).fillRoundedRect(318, 143, 315, 144, 70);
    graphics.lineStyle(2, 0xffffff, 0.6);
    graphics.lineBetween(475, 144, 475, 286);
    graphics.strokeCircle(475, 215, 31);

    // 남서쪽 연못과 수변 산책로.
    graphics.fillStyle(0x655875, 0.25).fillEllipse(185, 432, 220, 155);
    graphics.fillStyle(0xffe6bb).fillEllipse(181, 426, 215, 154);
    graphics.fillStyle(0x75cdec).fillEllipse(181, 426, 182, 125);
    graphics.fillStyle(0xa9e6f7).fillEllipse(157, 408, 78, 43);
    graphics.fillStyle(0xe5dcc0).fillRoundedRect(116, 418, 130, 12, 5);

    // 남동쪽 어린이 정원과 작은 광장.
    graphics.fillStyle(0x655875, 0.25).fillCircle(812, 460, 75);
    graphics.fillStyle(0xffd18a).fillCircle(807, 455, 72);
    graphics.fillStyle(0xffefd0).fillCircle(807, 455, 57);
    graphics.fillStyle(0xd9896d).fillCircle(780, 441, 12);
    graphics.fillStyle(0xe7bc51).fillCircle(820, 468, 14);
    graphics.fillStyle(0x73a7c7).fillRoundedRect(835, 424, 29, 18, 7);

    // 북쪽 시설 구역.
    for (const [x, width] of [[110, 68], [192, 58], [770, 68], [850, 76]] as const) {
      graphics.fillStyle(0x655875, 0.25).fillRoundedRect(x + 4, 70, width, 34, 4);
      graphics.fillStyle(0xcdb9ee).fillRoundedRect(x, 66, width, 34, 4);
      graphics.fillStyle(0xfff4c7).fillRect(x + 7, 72, width - 14, 9);
    }

    // 나무 군락: 운동장 가장자리와 외곽에 연속된 수목선을 만든다.
    const trees = [
      [66, 83], [110, 57], [158, 56], [216, 68], [265, 62], [731, 64], [786, 51], [842, 54], [902, 74], [946, 116],
      [69, 173], [70, 244], [64, 315], [59, 413], [76, 496], [116, 540], [202, 548], [278, 548], [356, 550],
      [435, 548], [525, 548], [614, 545], [733, 548], [817, 543], [903, 520], [946, 457], [946, 273], [949, 198],
      [256, 124], [254, 184], [253, 249], [273, 311], [691, 112], [691, 174], [691, 246], [678, 311],
      [324, 86], [378, 79], [431, 78], [489, 78], [545, 79], [605, 84],
      [313, 341], [369, 339], [425, 339], [483, 339], [542, 339], [599, 338], [654, 340],
      [324, 400], [374, 434], [339, 477], [442, 418], [505, 461], [580, 410], [626, 468],
    ] as const;
    trees.forEach(([x, y], index) => this.drawTree(x, y, 0.78 + (index % 3) * 0.1));

    this.add.text(475, 210, "BORAMAE PLAY GROUND", { fontFamily: "monospace", fontSize: "16px", color: "#526741", fontStyle: "bold" }).setOrigin(0.5).setAlpha(0.72);
    this.add.text(181, 426, "POND", { fontFamily: "monospace", fontSize: "14px", color: "#effcff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(807, 510, "KIDS GARDEN", { fontFamily: "monospace", fontSize: "12px", color: "#655875", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(18, 570, "⌨ WASD / 방향키", { fontFamily: "monospace", fontSize: "14px", color: "#51465e", backgroundColor: "#fff9f0dd", padding: { x: 8, y: 5 } }).setDepth(8);
  }

  private drawTree(x: number, y: number, scale: number) {
    this.add.ellipse(x + 5, y + 15, 35 * scale, 13 * scale, 0x51465e, 0.22);
    this.add.rectangle(x, y + 10 * scale, 9 * scale, 23 * scale, 0x9b6a55).setStrokeStyle(2, 0x51465e);
    this.add.circle(x - 8 * scale, y, 14 * scale, 0x45a868).setStrokeStyle(3, 0x51465e);
    this.add.circle(x + 8 * scale, y - 2 * scale, 16 * scale, 0x5cbc70).setStrokeStyle(3, 0x51465e);
    this.add.circle(x, y - 11 * scale, 15 * scale, 0x75cf7c).setStrokeStyle(3, 0x51465e);
  }
}

function colorFromId(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return [0xe98c75, 0x75b9e6, 0xb08ae6, 0x75c9a1][hash % 4];
}
