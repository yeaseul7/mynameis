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

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1600;
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 600;

export class WorldScene extends Phaser.Scene {
  private players = new Map<string, PlayerView>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private lastSentAt = 0;
  private lastSentX = 0;
  private lastSentY = 0;
  private minimap?: Phaser.GameObjects.Graphics;

  constructor(
    private room: Room,
    private onProfile: (profile: Profile) => void,
    private onReady: () => void,
  ) { super("world"); }

  create() {
    this.drawPark();
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
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
    if (sessionId === this.room.sessionId) { this.lastSentX = player.x; this.lastSentY = player.y; this.cameras.main.startFollow(body, true, 0.1, 0.1); }
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
      local.body.x = Phaser.Math.Clamp(local.body.x + dx / length * 220 * seconds, 22, MAP_WIDTH - 22);
      local.body.y = Phaser.Math.Clamp(local.body.y + dy / length * 220 * seconds, 22, MAP_HEIGHT - 22);
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
    this.drawMinimap();
  }

  private drawPark() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xbfe3f3).fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    graphics.fillStyle(0x9ed27e).fillRoundedRect(24, 24, MAP_WIDTH - 48, MAP_HEIGHT - 48, 42);
    graphics.lineStyle(10, 0x5f7658).strokeRoundedRect(24, 24, MAP_WIDTH - 48, MAP_HEIGHT - 48, 42);

    graphics.lineStyle(2, 0x86bd70, 0.3);
    for (let x = 40; x < MAP_WIDTH; x += 64) graphics.lineBetween(x, 30, x, MAP_HEIGHT - 30);
    for (let y = 40; y < MAP_HEIGHT; y += 64) graphics.lineBetween(30, y, MAP_WIDTH - 30, y);

    // 중앙 광장에서 네 구역으로 이어지는 산책로.
    graphics.lineStyle(76, 0x756b82, 0.22);
    graphics.lineBetween(1200, 800, 480, 800); graphics.lineBetween(1200, 800, 1920, 800);
    graphics.lineBetween(1200, 800, 1200, 300); graphics.lineBetween(1200, 800, 1200, 1320);
    graphics.lineStyle(58, 0xf3dfb9);
    graphics.lineBetween(1200, 800, 480, 800); graphics.lineBetween(1200, 800, 1920, 800);
    graphics.lineBetween(1200, 800, 1200, 300); graphics.lineBetween(1200, 800, 1200, 1320);

    this.drawPlaza(graphics);
    this.drawPlayground(graphics);
    this.drawParkZone(graphics);
    this.drawFoodCourt(graphics);
    this.drawGarden(graphics);

    for (let x = 90; x <= 2310; x += 115) { this.drawTree(x, 82 + (x % 3) * 8, 0.9); this.drawTree(x, 1510 - (x % 4) * 7, 0.9); }
    for (let y = 190; y <= 1410; y += 120) { this.drawTree(82 + (y % 3) * 7, y, 0.9); this.drawTree(2310 - (y % 4) * 6, y, 0.9); }

    this.add.text(18, VIEW_HEIGHT - 18, "⌨ WASD / 방향키  ·  우측 상단 전체 지도", { fontFamily: "monospace", fontSize: "14px", color: "#51465e", backgroundColor: "#fff9f0e8", padding: { x: 8, y: 5 } }).setOrigin(0, 1).setScrollFactor(0).setDepth(110);
    this.minimap = this.add.graphics().setScrollFactor(0).setDepth(105);
  }

  private zoneLabel(x: number, y: number, title: string, subtitle: string) {
    this.add.text(x, y, `${title}\n${subtitle}`, { align: "center", fontFamily: "monospace", fontSize: "22px", color: "#4f425c", fontStyle: "bold", backgroundColor: "#fffaf0dd", padding: { x: 14, y: 8 } }).setOrigin(0.5).setDepth(4);
  }

  private drawPlaza(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x72667d, 0.25).fillCircle(1207, 807, 235); g.fillStyle(0xf2d6a5).fillCircle(1200, 800, 225);
    g.lineStyle(3, 0xd3b885, 0.7); for (let r = 55; r < 215; r += 42) g.strokeCircle(1200, 800, r);
    g.fillStyle(0x78cce4).fillCircle(1200, 800, 68); g.fillStyle(0xf7f0db).fillCircle(1200, 800, 45); g.fillStyle(0x78cce4).fillCircle(1200, 800, 28);
    this.zoneLabel(1200, 1010, "중앙 광장", "PLAZA");
  }

  private drawPlayground(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x655875, 0.2).fillRoundedRect(130, 550, 650, 500, 70); g.fillStyle(0x79c79a).fillRoundedRect(120, 540, 650, 500, 70);
    g.fillStyle(0xf0b06f).fillRoundedRect(210, 635, 480, 300, 45); g.fillStyle(0x6ea4d1).fillRoundedRect(260, 700, 105, 38, 12); g.fillStyle(0xe76968).fillCircle(540, 745, 55);
    g.lineStyle(12, 0xf4db72); g.lineBetween(430, 670, 430, 890); g.lineBetween(390, 710, 470, 710); g.strokeCircle(430, 790, 72);
    this.zoneLabel(445, 585, "놀이터 존", "PLAYGROUND");
  }

  private drawParkZone(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xf2ddb8).fillEllipse(1930, 800, 760, 470); g.fillStyle(0xa9dc82).fillEllipse(1930, 800, 690, 400);
    g.lineStyle(34, 0x65b7c9); g.strokeEllipse(1930, 800, 625, 335); g.lineStyle(3, 0xeafcff, 0.8); g.strokeEllipse(1930, 800, 625, 335);
    g.fillStyle(0x72cce5).fillEllipse(1930, 800, 280, 145); g.fillStyle(0xf6e1b5).fillRoundedRect(1790, 790, 280, 18, 7);
    this.zoneLabel(1930, 580, "공원 존", "PARK & TRACK");
  }

  private drawFoodCourt(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xecc58c).fillRoundedRect(875, 90, 650, 360, 48);
    for (const [x, color] of [[940, 0xe66f6f], [1115, 0x6ba9d2], [1290, 0xe8b94f]] as const) { g.fillStyle(0xfff7e5).fillRoundedRect(x, 180, 135, 135, 12); g.fillStyle(color).fillRect(x, 180, 135, 30); g.fillStyle(0x6f5a4d).fillRect(x + 18, 240, 99, 12); }
    for (const x of [960, 1120, 1280, 1445]) { g.fillStyle(0xf8efd8).fillCircle(x, 370, 24); g.fillStyle(0x8b6f58).fillRect(x - 4, 370, 8, 35); }
    this.zoneLabel(1200, 130, "푸드코트", "FOOD COURT");
  }

  private drawGarden(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x75cdec).fillEllipse(1200, 1320, 420, 260); g.fillStyle(0xa9e6f7).fillEllipse(1150, 1280, 155, 80); g.fillStyle(0xf2ddb8).fillRoundedRect(995, 1310, 410, 22, 8);
    for (const [x, y, color] of [[1010, 1170, 0xf28a9d], [1110, 1130, 0xf2d06b], [1290, 1140, 0xb28add], [1400, 1200, 0xf28a9d]] as const) g.fillStyle(color).fillCircle(x, y, 25);
    this.zoneLabel(1200, 1480, "피크닉 정원", "GARDEN");
  }

  private drawMinimap() {
    if (!this.minimap) return;
    const g = this.minimap; const x = VIEW_WIDTH - 218; const y = 18; const w = 200; const h = 134;
    g.clear(); g.fillStyle(0x42364e, 0.84).fillRoundedRect(x - 5, y - 5, w + 10, h + 10, 9); g.fillStyle(0xfaf5df, 0.96).fillRect(x, y, w, h);
    const sx = w / MAP_WIDTH; const sy = h / MAP_HEIGHT;
    g.fillStyle(0xf0b06f).fillRect(x + 120 * sx, y + 540 * sy, 650 * sx, 500 * sy);
    g.fillStyle(0x65b7c9).fillEllipse(x + 1930 * sx, y + 800 * sy, 690 * sx, 400 * sy);
    g.fillStyle(0xecc58c).fillRect(x + 875 * sx, y + 90 * sy, 650 * sx, 360 * sy);
    g.fillStyle(0xf2d6a5).fillCircle(x + 1200 * sx, y + 800 * sy, 225 * sx);
    for (const [id, view] of this.players) { g.fillStyle(id === this.room.sessionId ? 0xff4f68 : 0x655875).fillCircle(x + view.body.x * sx, y + view.body.y * sy, id === this.room.sessionId ? 4 : 2.5); }
    g.lineStyle(2, 0xffffff, 0.9).strokeRect(x + this.cameras.main.scrollX * sx, y + this.cameras.main.scrollY * sy, VIEW_WIDTH * sx, VIEW_HEIGHT * sy);
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
