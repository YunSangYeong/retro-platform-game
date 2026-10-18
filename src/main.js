import Phaser from "phaser";
import "./style.css";
import { stages } from "./level.js";
import { Audio } from "./audio.js";
const sound = new Audio(),
  touch = { left: false, right: false, jump: false, run: false };
const palette = {
  a: 0x301810,
  b: 0x2455b8,
  c: 0xffc080,
  d: 0xe05018,
  e: 0xd86018,
  f: 0xffd038,
  g: 0xffffff,
};
class Grove extends Phaser.Scene {
  constructor() {
    super("Grove");
    this.lives = 3;
    this.score = 0;
    this.coins = 0;
  }
  init(data = {}) {
    this.stageIndex = data.stageIndex ?? 0;
    this.continueRun = !!data.continueRun;
    this.carryPower = !!data.powered;
    this.level = stages[this.stageIndex];
  }
  create() {
    const { width: WIDTH, blocks, pipes, enemies } = this.level;
    const isGap = (x) => this.level.gaps.some(([a, b]) => x >= a && x < b);
    const cave = this.stageIndex === 1;
    const citadel = this.stageIndex === 2;
    document.querySelector("#game").style.background = this.level.sky;
    const goalX = WIDTH - 106;
    document.querySelector(".cabinet-top span").innerHTML =
      `<i></i> WORLD 0${this.stageIndex + 1} — ${this.level.name}`;
    this.state = "title";
    this.remaining = this.level.time;
    this.jumpHeld = false;
    this.invincible = 0;
    this.powered = this.carryPower;
    this.lastCheckpoint = 32;
    this.makeTextures();
    this.cameras.main.setBackgroundColor(this.level.sky);
    this.physics.world.setBounds(0, 0, WIDTH, 288);
    this.cameras.main.setBounds(0, 0, WIDTH, 240);
    const bg = this.add.graphics();
    if (citadel) {
      bg.fillStyle(0xffd890);
      bg.fillRect(146, 52, 28, 24);
      bg.fillRect(142, 58, 36, 12);
      for (let x = 0; x < WIDTH; x += 144) {
        const top = 108 + (x % 3) * 12;
        bg.fillStyle(0x603850);
        bg.fillRect(x, top, 64, 208 - top);
        bg.fillRect(x - 4, top - 12, 16, 16);
        bg.fillRect(x + 24, top - 12, 16, 16);
        bg.fillRect(x + 52, top - 12, 16, 16);
        bg.fillStyle(0x301c38);
        bg.fillRect(x + 12, top + 20, 8, 16);
        bg.fillRect(x + 44, top + 20, 8, 16);
        bg.fillStyle(0x885068);
        bg.fillRect(x + 4, top + 4, 4, 204 - top);
      }
      bg.setScrollFactor(0.4, 1);
    } else if (!cave) {
      // Hard-edged silhouettes and a restricted console palette.
      for (let x = 40; x < WIDTH; x += 240) {
        bg.fillStyle(0x183800);
        bg.fillTriangle(x - 34, 208, x + 24, 150, x + 82, 208);
        bg.fillStyle(0x00a800);
        bg.fillTriangle(x - 30, 208, x + 24, 154, x + 78, 208);
        bg.fillStyle(0x183800);
        bg.fillRect(x + 16, 176, 3, 8);
        bg.fillRect(x + 35, 189, 3, 6);
      }
      for (let x = 30; x < WIDTH; x += 148) {
        const y = 48 + (Math.floor(x / 148) % 3) * 12;
        bg.fillStyle(0x254898);
        bg.fillRect(x - 2, y + 4, 44, 13);
        bg.fillStyle(0xffffff);
        bg.fillRect(x, y + 3, 40, 11);
        bg.fillRect(x + 8, y - 3, 10, 6);
        bg.fillRect(x + 18, y - 6, 12, 9);
        bg.fillStyle(0xb8d8f8);
        bg.fillRect(x + 4, y + 12, 31, 2);
      }
      bg.setScrollFactor(0.35, 1);
    } else {
      for (let x = 0; x < WIDTH; x += 16) {
        bg.fillStyle(0x303868);
        bg.fillRect(x, 30, 16, 16 + (x % 48));
        bg.fillStyle(0x182448);
        bg.fillTriangle(x, 40, x + 16, 40, x + 8, 68 + (x % 32));
      }
      for (let x = 48; x < WIDTH; x += 112) {
        bg.fillStyle(0x6670ac);
        bg.fillRect(x, 88 + (x % 80), 2, 2);
        bg.fillStyle(0x294478);
        bg.fillTriangle(x - 20, 208, x, 146, x + 24, 208);
        bg.fillStyle(0x64d8e8);
        bg.fillTriangle(x - 8, 208, x, 178, x + 6, 208);
      }
      bg.setScrollFactor(0.6, 1);
    }
    this.solids = this.physics.add.staticGroup();
    for (let x = 0; x < WIDTH; x += 16)
      if (!isGap(x)) {
        this.solids
          .create(x, 208, citadel ? "castle" : cave ? "stone" : "ground")
          .setOrigin(0)
          .refreshBody();
        this.add
          .image(x, 224, citadel ? "castle" : cave ? "stone" : "dirt")
          .setOrigin(0);
      }
    for (let x = 72; !cave && !citadel && x < WIDTH; x += 192) {
      const g = this.add.graphics();
      g.fillStyle(0x183800);
      g.fillRect(x - 18, 200, 52, 8);
      g.fillRect(x - 10, 192, 36, 8);
      g.fillRect(x, 188, 16, 4);
      g.fillStyle(0x00a800);
      g.fillRect(x - 16, 202, 48, 6);
      g.fillRect(x - 8, 194, 32, 8);
      g.fillRect(x + 2, 190, 12, 4);
    }
    blocks.forEach(([x, y], i) => {
      const b = this.solids
        .create(x, y, i % 3 === 1 ? "item" : "brick")
        .setOrigin(0)
        .refreshBody();
      b.item = i % 3 === 1;
      b.used = false;
      b.power = i % 6 === 1;
    });
    pipes.forEach(([x, h]) => {
      const g = this.add.graphics();
      g.fillStyle(0x183800);
      g.fillRect(x, 208 - h, 28, h);
      g.fillStyle(0x00a800);
      g.fillRect(x + 3, 208 - h, 20, h);
      g.fillStyle(0xb8f818);
      g.fillRect(x + 5, 208 - h, 4, h);
      g.fillStyle(0x005800);
      g.fillRect(x - 2, 208 - h, 32, 8);
      g.fillStyle(0xb8f818);
      g.fillRect(x, 210 - h, 26, 2);
      this.solids
        .create(x, 208 - h, "blank")
        .setOrigin(0)
        .setDisplaySize(28, h)
        .refreshBody()
        .setVisible(false);
    });
    this.pickups = this.physics.add.staticGroup();
    for (let x = 112; x < WIDTH - 164; x += 64) {
      if (!isGap(x)) this.pickups.create(x, x % 128 === 48 ? 139 : 178, "coin");
    }
    blocks.forEach(([x, y]) => this.pickups.create(x + 8, y - 18, "coin"));
    this.powerups = this.physics.add.group();
    this.physics.add.collider(this.powerups, this.solids, (item) => {
      if (item.body.blocked.left || item.body.blocked.right) {
        item.direction *= -1;
        item.setVelocityX(item.direction * 36);
      }
    });
    this.foes = this.physics.add.group({ allowGravity: true });
    enemies.forEach((x, i) => {
      let e = this.foes.create(x, 198, "foe");
      e.setSize(12, 12).setVelocityX(i % 2 ? 24 : -24);
      e.home = x;
      e.direction = i % 2 ? 1 : -1;
    });
    this.player = this.physics.add
      .sprite(32, 190, "hero0")
      .setSize(10, 14)
      .setOffset(3, 2)
      .setMaxVelocity(160, 370);
    this.player.setCollideWorldBounds(false);
    if (this.powered) this.player.setScale(1, 1.5);
    this.physics.add.collider(this.player, this.solids, (p, b) => {
      if (p.body.blocked.up && p.y > b.y) {
        if (b.item && !b.used) {
          b.used = true;
          b.setTexture("used");
          this.getCoin();
          this.score += 100;
          const coin = this.add.image(b.x + 8, b.y - 8, "coin").setDepth(5);
          this.tweens.add({
            targets: coin,
            y: b.y - 40,
            duration: 380,
            yoyo: true,
            onComplete: () => coin.destroy(),
          });
          this.floatText(b.x + 8, b.y - 20, "+150");
          if (b.power) this.spawnPower(b);
          this.tweens.add({ targets: b, y: b.y - 4, duration: 70, yoyo: true });
        }
        sound.play("block");
      }
    });
    this.physics.add.collider(this.foes, this.solids, (e) => {
      if (e.body.blocked.left || e.body.blocked.right) {
        e.direction *= -1;
        e.setVelocityX(e.direction * 24);
      }
    });
    this.physics.add.overlap(this.player, this.pickups, (p, c) => {
      c.destroy();
      this.getCoin();
    });
    this.physics.add.overlap(this.player, this.powerups, (p, item) => {
      if (this.state !== "playing" || !item.ready) return;
      item.destroy();
      this.score += 1000;
      this.powered = true;
      p.setScale(1, 1.5);
      p.y -= 4;
      this.invincible = 900;
      this.floatText(p.x, p.y - 24, "POWER UP!");
      sound.play("power");
    });
    this.physics.add.overlap(this.player, this.foes, (p, e) => {
      if (this.state !== "playing") return;
      if (p.body.velocity.y > 0 && p.body.bottom < e.body.top + 9) {
        e.destroy();
        p.setVelocityY(-160);
        this.score += 200;
        sound.play("stomp");
      } else this.hurt();
    });
    const goal = this.add.graphics();
    goal.fillStyle(0xe9e6bc);
    goal.fillRect(goalX + 16, 92, 3, 116);
    goal.fillStyle(0xd87e5c);
    goal.fillTriangle(goalX + 19, 94, goalX + 46, 103, goalX + 19, 113);
    goal.fillStyle(0x315657);
    goal.fillRect(goalX + 42, 176, 48, 32);
    goal.fillStyle(0xf0cc8a);
    goal.fillRect(goalX + 58, 184, 12, 24);
    this.add.text(goalX - 4, 76, "HOME", { fontSize: "8px", color: "#284c50" });
    this.hud = this.add
      .text(8, 8, "", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#fff5cc",
        stroke: "#29494b",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(20);
    this.keys = this.input.keyboard.addKeys({
      left: "LEFT",
      right: "RIGHT",
      jump: "Z",
      space: "SPACE",
      run: "X",
      shift: "SHIFT",
      pause: "P",
      mute: "M",
      enter: "ENTER",
    });
    this.input.keyboard.on("keydown-P", () => this.pauseGame());
    this.input.keyboard.on("keydown-M", () => toggleMute());
    this.input.keyboard.on("keydown-ENTER", () => this.activate());
    this.input.on("pointerdown", () => {
      sound.unlock();
      this.activate();
    });
    this.cameras.main.startFollow(this.player, false, 0.09, 1);
    this.cameras.main.setDeadzone(42, 0);
    this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(30);
    this.showOverlay("MOONLEAF\nRUN", "달잎 탐험", "Z / SPACE OR TAP TO START");
    this.physics.pause();
    if (this.continueRun) {
      this.showOverlay(
        `WORLD 0${this.stageIndex + 1}`,
        this.level.title,
        "Z / SPACE / ENTER / TAP TO START",
      );
    }
    this.updateHUD();
    window.__gameScene = this;
  }
  makeTextures() {
    if (this.textures.exists("hero0")) return;
    const sprite = (name, rows, colors = palette) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      rows.forEach((r, y) =>
        [...r].forEach((c, x) => {
          if (colors[c] !== undefined) {
            g.fillStyle(colors[c]);
            g.fillRect(x, y, 1, 1);
          }
        }),
      );
      g.generateTexture(name, 16, 16);
      g.destroy();
    };
    const hero = [
      "................",
      ".....eeee.......",
      "....effffe......",
      "....eeeeee......",
      "....cccccc......",
      "....cacacc......",
      ".....cccc.......",
      "....dddddd......",
      "...ddbddbdd.....",
      "...cdbbbbdc.....",
      "....bbbbbb......",
      "....beeeeb......",
      "....ee..ee......",
      "....ee..ee......",
      "...aaa..aaa.....",
      "................",
    ];
    sprite("hero0", hero);
    const walk = [...hero];
    walk[12] = "...ee....ee.....";
    walk[13] = "...ee.....ee....";
    walk[14] = "..aaa.....aaa...";
    sprite("hero1", walk);
    const jump = [...hero];
    jump[8] = "..ccdbbddbcc....";
    jump[13] = "...ee...ee......";
    jump[14] = "..aaa...aaa.....";
    sprite("hero2", jump);
    const fall = [...jump];
    fall[8] = "...cdbbbbdc.....";
    fall[12] = "...ee....ee.....";
    sprite("hero3", fall);
    sprite("foe", [
      "................",
      "................",
      "................",
      "................",
      ".....dddddd.....",
      "...ddddddddd....",
      "..ddccccccddd...",
      "..ddacaacaddd...",
      "..ddccccccddd...",
      "...ddddddddd....",
      "....ddddddd.....",
      "...aa....aa.....",
      "..aaa....aaa....",
    ]);
    const tile = (key, fn) => {
      const g = this.make.graphics({ add: false });
      fn(g);
      g.generateTexture(key, 16, 16);
      g.destroy();
    };
    for (const key of ["ground", "dirt"])
      tile(key, (g) => {
        g.fillStyle(0xc84c0c);
        g.fillRect(0, 0, 16, 16);
        g.fillStyle(0x301810);
        g.fillRect(0, 0, 16, 1);
        g.fillRect(0, 0, 1, 16);
        g.fillRect(0, 8, 16, 1);
        g.fillRect(8, 0, 1, 8);
        g.fillRect(4, 8, 1, 8);
        g.fillStyle(0xfcbcb0);
        g.fillRect(1, 1, 6, 1);
        g.fillRect(10, 1, 5, 1);
        g.fillRect(1, 9, 2, 1);
        g.fillRect(5, 9, 10, 1);
      });
    tile("brick", (g) => {
      g.fillStyle(0xc84c0c);
      g.fillRect(0, 0, 16, 16);
      g.lineStyle(1, 0x301810);
      g.strokeRect(0, 0, 16, 16);
      g.lineBetween(0, 8, 16, 8);
      g.lineBetween(8, 0, 8, 8);
      g.lineBetween(4, 8, 4, 16);
      g.fillStyle(0xfcbcb0);
      g.fillRect(1, 1, 14, 2);
      g.fillRect(1, 9, 14, 1);
    });
    for (const key of ["item", "used"])
      tile(key, (g) => {
        g.fillStyle(key === "item" ? 0xfca044 : 0x886000);
        g.fillRect(0, 0, 16, 16);
        g.lineStyle(1, 0x301810);
        g.strokeRect(0, 0, 16, 16);
        g.fillStyle(0xffe8a0);
        if (key === "item") {
          g.fillRect(6, 3, 5, 2);
          g.fillRect(9, 5, 2, 3);
          g.fillRect(7, 7, 3, 2);
          g.fillRect(7, 11, 2, 2);
        }
      });
    tile("coin", (g) => {
      g.fillStyle(0xa77738);
      g.fillEllipse(8, 8, 9, 12);
      g.fillStyle(0xffdc76);
      g.fillEllipse(7, 7, 7, 11);
      g.fillStyle(0xfff1bf);
      g.fillRect(6, 4, 2, 6);
    });
    sprite("power", [
      "................",
      "......ffff......",
      "....fffffff.....",
      "...ffgggggff....",
      "..ffggfgfggff...",
      "..fgggggggggf...",
      "..ffffffffff....",
      ".....cccc.......",
      ".....caccc......",
      ".....cccc.......",
      "....cccccc......",
      "....aaaaaa......",
      "................",
      "................",
      "................",
      "................",
    ]);
    tile("stone", (g) => {
      g.fillStyle(0x405080);
      g.fillRect(0, 0, 16, 16);
      g.fillStyle(0x101830);
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 8, 16, 1);
      g.fillRect(0, 0, 1, 16);
      g.fillRect(8, 0, 1, 8);
      g.fillRect(4, 8, 1, 8);
      g.fillStyle(0x8098c0);
      g.fillRect(1, 1, 6, 2);
      g.fillRect(9, 1, 6, 1);
      g.fillRect(5, 9, 10, 1);
    });
    tile("castle", (g) => {
      g.fillStyle(0x906878);
      g.fillRect(0, 0, 16, 16);
      g.fillStyle(0x382838);
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 8, 16, 1);
      g.fillRect(0, 0, 1, 16);
      g.fillRect(8, 0, 1, 8);
      g.fillRect(4, 8, 1, 8);
      g.fillStyle(0xe0b0a0);
      g.fillRect(1, 1, 6, 2);
      g.fillRect(9, 1, 6, 1);
      g.fillRect(5, 9, 10, 1);
    });
    tile("blank", () => {});
  }
  showOverlay(title, sub, hint) {
    this.overlay.removeAll(true);
    const shade = this.add.rectangle(128, 120, 256, 240, 0x142c38, 0.66);
    const box = this.add
      .rectangle(128, 120, 224, 124, 0x17383d, 0.95)
      .setStrokeStyle(1, 0x9aba7c);
    const t = this.add
      .text(128, 83, title, {
        fontFamily: "monospace",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#e9e9b7",
        align: "center",
        lineSpacing: 2,
      })
      .setOrigin(0.5);
    const s = this.add
      .text(128, 133, sub, {
        fontFamily: "sans-serif",
        fontSize: "10px",
        color: "#b9d697",
      })
      .setOrigin(0.5);
    const h = this.add
      .text(128, 157, hint, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#f2d498",
      })
      .setOrigin(0.5);
    this.overlay.add([shade, box, t, s, h]);
  }
  activate() {
    sound.unlock();
    if (this.state === "title") {
      this.state = "playing";
      this.overlay.removeAll(true);
      this.physics.resume();
    } else if (this.state === "paused") this.pauseGame();
    else if (this.state === "clear" && this.stageIndex < stages.length - 1) {
      this.scene.restart({
        stageIndex: this.stageIndex + 1,
        continueRun: true,
        powered: this.powered,
      });
    } else if (["over", "clear"].includes(this.state)) {
      this.lives = 3;
      this.score = 0;
      this.coins = 0;
      this.scene.restart({ stageIndex: 0 });
    }
  }
  pauseGame() {
    if (this.state === "playing") {
      this.state = "paused";
      this.physics.pause();
      this.showOverlay("PAUSED", "잠시 쉬어 가요", "P / TAP TO RESUME");
    } else if (this.state === "paused") {
      this.state = "playing";
      this.overlay.removeAll(true);
      this.physics.resume();
    }
  }
  floatText(x, y, label) {
    const text = this.add
      .text(x, y, label, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#ffffff",
        stroke: "#301810",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: text,
      y: y - 22,
      alpha: 0,
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }
  spawnPower(block) {
    const item = this.powerups
      .create(block.x + 8, block.y + 8, "power")
      .setDepth(2);
    item.body.enable = false;
    item.ready = false;
    item.direction = 1;
    this.tweens.add({
      targets: item,
      y: block.y - 9,
      duration: 450,
      onComplete: () => {
        if (!item.active) return;
        item.body.enable = true;
        item.body.reset(item.x, item.y);
        item.ready = true;
        item.setVelocityX(36);
      },
    });
    sound.play("appear");
  }
  getCoin() {
    this.coins++;
    this.score += 50;
    sound.play("coin");
  }
  hurt(fall = false) {
    if ((!fall && this.invincible > 0) || this.state !== "playing") return;
    if (this.powered && !fall) {
      this.powered = false;
      this.player.setScale(1);
      this.invincible = 1600;
      sound.play("hurt");
      this.floatText(this.player.x, this.player.y - 20, "POWER DOWN");
      return;
    }
    this.powered = false;
    this.player.setScale(1);
    this.lives--;
    sound.play("hurt");
    if (this.lives <= 0) {
      this.finish("over");
      return;
    }
    this.player.setPosition(this.lastCheckpoint, 180).setVelocity(0, 0);
    this.invincible = 1800;
  }
  finish(state) {
    if (this.state !== "playing") return;
    this.state = state;
    this.physics.pause();
    if (state === "clear") {
      this.score += Math.floor(this.remaining) * 10;
      sound.play("clear");
    }
    const next = stages[this.stageIndex + 1];
    this.showOverlay(
      state === "clear"
        ? next
          ? `WORLD 0${this.stageIndex + 1} CLEAR!`
          : "ALL CLEAR!"
        : "GAME OVER",
      state === "clear"
        ? next
          ? `다음 모험: ${next.title}`
          : "세 번의 모험을 모두 완주했어요!"
        : "다시, 한 걸음부터",
      state === "clear" && next
        ? `ENTER / TAP : WORLD 0${this.stageIndex + 2}`
        : "ENTER / TAP TO RESTART",
    );
    this.updateHUD();
  }
  updateHUD() {
    this.hud.setText(
      `SCORE ${String(this.score).padStart(6, "0")}   COIN ${String(this.coins).padStart(2, "0")}\n♥ ${this.lives}     WORLD 0${this.stageIndex + 1}        TIME ${Math.ceil(this.remaining)}`,
    );
  }
  update(time, dt) {
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)
    ) {
      if (
        this.state === "title" ||
        this.state === "over" ||
        this.state === "clear"
      )
        this.activate();
    }
    if (this.state !== "playing") return;
    dt = Math.min(dt, 50);
    sound.update(dt);
    this.remaining -= dt / 1000;
    this.invincible = Math.max(0, this.invincible - dt);
    this.player.setAlpha(
      this.invincible > 0 && Math.floor(time / 90) % 2 ? 0.35 : 1,
    );
    const p = this.player,
      ground = p.body.blocked.down,
      left = this.keys.left.isDown || touch.left,
      right = this.keys.right.isDown || touch.right,
      run = this.keys.run.isDown || this.keys.shift.isDown || touch.run,
      jump = this.keys.jump.isDown || this.keys.space.isDown || touch.jump;
    const direction = Number(right) - Number(left);
    p.setAccelerationX(direction * (ground ? 620 : 390));
    p.setDragX(ground ? 780 : 90);
    p.setMaxVelocity(run ? 144 : 90, 370);
    if (direction) p.setFlipX(direction < 0);
    if (ground) this.lastGround = time;
    if (jump && !this.jumpHeld && (ground || time - this.lastGround < 85)) {
      p.setVelocityY(-280);
      this.lastGround = -1000;
      sound.play("jump");
    }
    if (!jump && this.jumpHeld && p.body.velocity.y < -95) p.setVelocityY(-95);
    this.jumpHeld = jump;
    p.setTexture(
      !ground
        ? p.body.velocity.y > 0
          ? "hero3"
          : "hero2"
        : Math.abs(p.body.velocity.x) > 8 &&
            Math.floor(time / (run ? 65 : 110)) % 2
          ? "hero1"
          : "hero0",
    );
    if (p.x < 8) {
      p.x = 8;
      p.setVelocityX(0);
    }
    if (p.y > 260 || this.remaining <= 0) {
      if (this.remaining <= 0) this.finish("over");
      else this.hurt(true);
    }
    this.powerups.children.iterate((item) => {
      if (item?.active && item.y > 270) item.destroy();
    });
    this.foes.children.iterate((e) => {
      if (!e?.active) return;
      if (Math.abs(e.x - e.home) > 28) {
        e.direction = e.x > e.home ? -1 : 1;
        e.setVelocityX(e.direction * 24);
      }
      if (e.y > 260) e.destroy();
    });
    if (p.x > this.level.width - 106) this.finish("clear");
    this.updateHUD();
  }
}
function toggleMute() {
  sound.muted = !sound.muted;
  document.querySelector("#mute").textContent = sound.muted
    ? "SOUND OFF"
    : "SOUND ON";
}
document.querySelector("#mute").onclick = toggleMute;
document.querySelector("#pause").onclick = () =>
  window.__gameScene?.pauseGame();
for (const b of document.querySelectorAll("[data-key]")) {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    touch[b.dataset.key] = true;
    b.classList.add("active");
    sound.unlock();
    if (window.__gameScene?.state === "title") window.__gameScene.activate();
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => {
      touch[b.dataset.key] = false;
      b.classList.remove("active");
    });
}
window.addEventListener("blur", () => {
  Object.keys(touch).forEach((k) => (touch[k] = false));
  if (window.__gameScene?.state === "playing") window.__gameScene.pauseGame();
});
const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: 256,
  height: 240,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#5c94fc",
  physics: { default: "arcade", arcade: { gravity: { y: 650 }, debug: false } },
  scale: { mode: Phaser.Scale.NONE },
  scene: Grove,
});
function resize() {
  const available = document.querySelector("#game").clientWidth;
  const scale = available >= 512 ? 2 : available >= 256 ? 1 : available / 256;
  game.canvas.style.width = `${256 * scale}px`;
  game.canvas.style.height = `${240 * scale}px`;
}
window.addEventListener("resize", resize);
game.events.once("ready", resize);
setTimeout(resize, 100);
