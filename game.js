const W = 405;
const H = 720;
const ROWS = 6;
const COLS = 6;
const STARTING_WALLET = 1000;
const DEFAULT_BET = 100;
const BET_STEP = 10;
const MIN_BET = 10;
const MAX_BET = 500;
const MAX_MOVES = 12;
const TYPES = ["red", "blue", "green", "yellow", "purple"];
const COLORS = {
  red: 0xff5372,
  blue: 0x58c8ff,
  green: 0x79df7b,
  yellow: 0xffdf57,
  purple: 0xc77bff,
  chocolate: 0x9a522c
};
const LABELS = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
  purple: "Purple",
  any: "Any",
  cascade: "Cascades",
  chocolate: "Chocolate"
};

class CandyOrdersScene extends Phaser.Scene {
  constructor() {
    super("CandyOrdersScene");
    this.cell = 54;
    this.boardX = Math.round((W - this.cell * COLS) / 2);
    this.boardY = 280;
  }

  preload() {
    this.load.image("sym-red", "assets/symbols/symbol-red.png");
    this.load.image("sym-blue", "assets/symbols/symbol-blue.png");
    this.load.image("sym-green", "assets/symbols/symbol-green.png");
    this.load.image("sym-yellow", "assets/symbols/symbol-yellow.png");
    this.load.image("sym-purple", "assets/symbols/symbol-purple.png");
    this.load.image("sym-stripe-row", "assets/symbols/symbol-stripe.png");
    this.load.image("sym-stripe-col", "assets/symbols/symbol-stripe.png");
    this.load.image("sym-bomb", "assets/symbols/symbol-bomb.png");
    this.load.image("sym-chocolate", "assets/symbols/symbol-chocolate.png");
    this.load.image("ui-board", "assets/ui/ui-board.png");
    this.load.image("ui-order-a", "assets/ui/ui-order-a.png");
    this.load.image("ui-order-b", "assets/ui/ui-order-b.png");
    this.load.image("ui-status", "assets/ui/ui-status.png");
    this.load.image("ui-popup", "assets/ui/ui-popup.png");
  }

  create() {
    this.board = [];
    this.sprites = [];
    this.allCandySprites = new Set();
    this.fxSprites = new Set();
    this.selected = null;
    this.busy = false;
    this.resolvingMove = false;
    this.inputOpen = false;
    this.sessionActive = false;
    this.wallet = STARTING_WALLET;
    this.musicStarted = false;
    this.musicTimer = null;
    this.betAmount = DEFAULT_BET;
    this.movesMade = 0;
    this.endReason = "";
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.betAmount = Phaser.Math.Clamp(this.betAmount, MIN_BET, Math.max(MIN_BET, Math.min(MAX_BET, this.wallet)));

    this.createSymbolTextures();
    this.createBackground();
    this.createUi();
    this.createBoardFrame();
    this.showPreStart();
  }

  createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xff78bf, 0xffc84f, 0x7e73ff, 0x39208a, 1);
    bg.fillRect(0, 0, W, H);
    bg.fillStyle(0xfff06a, 0.13);
    bg.fillCircle(75, 188, 52);
    bg.fillStyle(0x5df2ff, 0.12);
    bg.fillCircle(347, 360, 48);
    bg.fillStyle(0xffffff, 0.07);
    bg.fillCircle(126, 625, 34);
    this.add.rectangle(W / 2, 126, W - 24, 232, 0x6d2b87, 0.82).setStrokeStyle(4, 0xfff06a, 0.95);
    this.add.rectangle(W / 2, 622, W - 28, 150, 0x3b1f72, 0.72).setStrokeStyle(2, 0xffffff, 0.28);
  }

  createSymbolTextures() {
    const defs = [
      ["sym-red", "gummy", "#ff5372", "#7b1630"],
      ["sym-blue", "lollipop", "#58c8ff", "#164a7b"],
      ["sym-green", "bear", "#79df7b", "#1d6b3c"],
      ["sym-yellow", "wrapped", "#ffdf57", "#8a5e0b"],
      ["sym-purple", "planet", "#c77bff", "#5a258e"],
      ["sym-stripe-row", "stripeH", "#ffdf57", "#8a5e0b"],
      ["sym-stripe-col", "stripeV", "#58c8ff", "#164a7b"],
      ["sym-bomb", "bomb", "#ff5aa7", "#64204a"],
      ["sym-chocolate", "chocolate", "#9a522c", "#3a1d12"]
    ];
    defs.forEach(([key, kind, color, outline]) => {
      if (this.textures.exists(key)) return;
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      const r = (x, y, w, h, fill) => {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
      };
      const shine = () => {
        r(18, 12, 10, 6, "rgba(255,255,255,.82)");
        r(15, 19, 5, 4, "rgba(255,255,255,.55)");
      };
      r(14, 46, 34, 8, "rgba(36,16,48,.28)");
      if (kind === "wrapped" || kind === "stripeH" || kind === "stripeV") {
        r(4, 24, 12, 18, outline);
        r(48, 24, 12, 18, outline);
        r(8, 27, 10, 12, "#fff4cf");
        r(46, 27, 10, 12, "#fff4cf");
        r(16, 14, 32, 38, outline);
        r(20, 17, 24, 32, color);
        if (kind === "stripeH") {
          r(20, 25, 24, 5, "#ffffff");
          r(20, 36, 24, 5, "#ffffff");
        } else if (kind === "stripeV") {
          r(27, 17, 5, 32, "#ffffff");
          r(36, 17, 5, 32, "#ffffff");
        } else {
          r(29, 17, 5, 32, "#fff6b8");
        }
        shine();
      } else if (kind === "bear" || kind === "gummy") {
        r(16, 10, 12, 12, outline);
        r(36, 10, 12, 12, outline);
        r(19, 13, 8, 8, color);
        r(37, 13, 8, 8, color);
        r(13, 18, 38, 40, outline);
        r(17, 21, 30, 34, color);
        r(23, 30, 5, 5, "#1c1026");
        r(36, 30, 5, 5, "#1c1026");
        r(29, 39, 8, 4, "#1c1026");
        shine();
      } else if (kind === "lollipop") {
        r(29, 38, 6, 18, outline);
        r(30, 39, 4, 15, "#ffe0d4");
        r(11, 7, 42, 42, outline);
        r(15, 11, 34, 34, color);
        r(22, 17, 22, 5, "#cfffff");
        r(19, 28, 28, 5, "#ffffff");
        shine();
      } else if (kind === "planet") {
        r(13, 13, 38, 38, outline);
        r(17, 17, 30, 30, color);
        r(4, 31, 56, 8, outline);
        r(8, 32, 48, 5, "#ffd28f");
        r(19, 19, 8, 6, "#ffffff");
        r(38, 35, 5, 5, "#6ee8ff");
        r(27, 30, 5, 5, "#ff8bd4");
      } else if (kind === "bomb") {
        r(14, 17, 38, 38, outline);
        r(18, 21, 30, 30, color);
        r(27, 8, 14, 14, outline);
        r(30, 4, 8, 10, "#ffef70");
        r(23, 31, 18, 6, "#ffffff");
        r(18, 17, 8, 6, "#ffd0e7");
      } else if (kind === "chocolate") {
        r(12, 10, 42, 44, outline);
        r(16, 14, 34, 36, color);
        r(17, 30, 32, 4, "#4a2415");
        r(32, 15, 4, 34, "#4a2415");
        r(20, 17, 10, 7, "#d98b4a");
        r(39, 36, 7, 6, "#c47a40");
      }
      this.textures.addCanvas(key, canvas);
    });
  }

  playPopSound(pitch = 520) {
    try {
      const ctx = this.sound.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.7, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playComboVoice() {
    try {
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
        const cuteVoice = voices.find((v) => /child|kid|girl|aria|jenny|zira|samantha|female/i.test(v.name))
          || voices.find((v) => /en/i.test(v.lang))
          || null;
        window.speechSynthesis.cancel();
        const voice = new SpeechSynthesisUtterance("Combo!");
        voice.lang = cuteVoice ? cuteVoice.lang : "en-US";
        voice.voice = cuteVoice;
        voice.pitch = 2;
        voice.rate = 1.62;
        voice.volume = 0.86;
        window.speechSynthesis.speak(voice);
      }
    } catch (e) {}
    try {
      const ctx = this.sound.context;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2400, ctx.currentTime);
      filter.Q.setValueAtTime(8, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
      filter.connect(gain);
      gain.connect(ctx.destination);
      [0, 0.055, 0.12, 0.205].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? "triangle" : "square";
        osc.frequency.setValueAtTime([1568, 2093, 2637, 3520][i], ctx.currentTime + offset);
        osc.frequency.exponentialRampToValueAtTime([2093, 2637, 3520, 4186][i], ctx.currentTime + offset + 0.08);
        osc.connect(filter);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.095);
      });
    } catch (e) {}
  }

  startCuteMusic() {
    if (this.musicStarted) return;
    this.musicStarted = true;
    const notes = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 988, 880, 784, 659, 587];
    let step = 0;
    const playNote = () => {
      try {
        const ctx = this.sound.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const freq = notes[step % notes.length];
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.018, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        if (step % 4 === 0) this.playPopSound(196);
        step += 1;
      } catch (e) {}
    };
    playNote();
    this.musicTimer = this.time.addEvent({ delay: 260, loop: true, callback: playNote });
  }

  burstAt(x, y, color = 0xffffff) {
    const bits = [];
    for (let i = 0; i < 5; i++) {
      const bit = this.add.rectangle(x, y, 5, 5, color, 0.95);
      bit.isFxSprite = true;
      this.fxSprites.add(bit);
      bits.push(bit);
      const angle = (Math.PI * 2 * i) / 5;
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * 28,
        y: y + Math.sin(angle) * 28,
        alpha: 0,
        scale: 0.2,
        duration: 260,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(bit)
      });
      this.time.delayedCall(420, () => this.destroyFx(bit));
    }
  }

  addFxRect(x, y, w, h, color, alpha = 1) {
    const rect = this.add.rectangle(x, y, w, h, color, alpha);
    rect.isFxSprite = true;
    this.fxSprites.add(rect);
    return rect;
  }

  playStripeFx(r, c, dir) {
    const x = this.cellX(c);
    const y = this.cellY(r);
    const horizontal = dir === "stripeRow";
    const beam = this.addFxRect(
      horizontal ? W / 2 : x,
      horizontal ? y : this.boardY + (this.cell * ROWS) / 2,
      horizontal ? this.cell * COLS + 20 : 18,
      horizontal ? 18 : this.cell * ROWS + 20,
      0xff8fc7,
      0.75
    );
    const core = this.addFxRect(
      beam.x,
      beam.y,
      horizontal ? this.cell * COLS + 12 : 7,
      horizontal ? 7 : this.cell * ROWS + 12,
      0x8ee8ff,
      0.95
    );
    const sparkleA = this.addFxRect(x, y, 14, 14, 0xffe277, 1);
    const sparkleB = this.addFxRect(x, y, 8, 8, 0xffffff, 0.9);
    [beam, core].forEach((item, i) => {
      this.tweens.add({
        targets: item,
        scaleX: horizontal ? 1.08 : 0.7,
        scaleY: horizontal ? 0.7 : 1.08,
        alpha: 0,
        duration: 360 + i * 70,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(item)
      });
    });
    [sparkleA, sparkleB].forEach((item, i) => {
      this.tweens.add({
        targets: item,
        angle: 180,
        scale: 2.3 + i * 0.6,
        alpha: 0,
        duration: 420,
        ease: "Back.Out",
        onComplete: () => this.destroyFx(item)
      });
    });
    this.playPopSound(1180);
    return this.wait(300);
  }

  playBombFx(r, c) {
    const x = this.cellX(c);
    const y = this.cellY(r);
    const ring = this.add.circle(x, y, 10, 0xff8fc7, 0.28).setStrokeStyle(5, 0xffe277, 0.95);
    ring.isFxSprite = true;
    this.fxSprites.add(ring);
    this.tweens.add({
      targets: ring,
      radius: 72,
      alpha: 0,
      duration: 440,
      ease: "Cubic.Out",
      onComplete: () => this.destroyFx(ring)
    });
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const bit = this.addFxRect(x, y, i % 2 ? 8 : 12, i % 2 ? 12 : 8, i % 3 === 0 ? 0x8ee8ff : i % 3 === 1 ? 0xff8fc7 : 0xffe277, 1);
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * 82,
        y: y + Math.sin(angle) * 82,
        angle: 180,
        scale: 0.25,
        alpha: 0,
        duration: 470,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(bit)
      });
    }
    this.playPopSound(420);
    this.time.delayedCall(80, () => this.playPopSound(980));
    return this.wait(390);
  }

  playChocolateFx(r, c, colorType) {
    const x = this.cellX(c);
    const y = this.cellY(r);
    const colorMap = { red: 0xff4f88, blue: 0x56bfff, green: 0x57d97c, yellow: 0xffdf4d, purple: 0xb95cff };
    const tint = colorMap[colorType] || 0xffe277;
    const splash = this.add.circle(x, y, 16, 0x6b311d, 0.65).setStrokeStyle(4, tint, 0.95);
    splash.isFxSprite = true;
    this.fxSprites.add(splash);
    this.tweens.add({
      targets: splash,
      radius: 58,
      alpha: 0,
      duration: 520,
      ease: "Cubic.Out",
      onComplete: () => this.destroyFx(splash)
    });
    for (let i = 0; i < 10; i++) {
      const bit = this.addFxRect(x, y, 9, 9, i % 2 ? 0x8a4728 : tint, 1);
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * (42 + (i % 3) * 12),
        y: y + Math.sin(angle) * (42 + (i % 2) * 10),
        angle: 90,
        alpha: 0,
        duration: 460,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(bit)
      });
    }
    this.playPopSound(560);
    this.time.delayedCall(90, () => this.playPopSound(1440));
    return this.wait(410);
  }

  playSpecialActivationFx(tile, pos, otherTile) {
    const [r, c] = pos;
    if (tile.special === "stripeRow" || tile.special === "stripeCol") return this.playStripeFx(r, c, tile.special);
    if (tile.special === "bomb") return this.playBombFx(r, c);
    if (tile.special === "chocolate") {
      const color = TYPES.includes(otherTile.type) ? otherTile.type : tile.type;
      return this.playChocolateFx(r, c, color);
    }
    return this.wait(0);
  }

  showComboText(combo) {
    this.playComboVoice();
    const label = this.add.text(W / 2, this.boardY + 150, `COMBO x${combo}`, {
      fontSize: 54,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#b218c9",
      strokeThickness: 10
    }).setOrigin(0.5);
    label.isFxSprite = true;
    this.fxSprites.add(label);
    label.setScale(0.55);
    this.tweens.add({
      targets: label,
      y: label.y - 64,
      scale: 1.22,
      alpha: 0,
      delay: 420,
      duration: 1350,
      ease: "Back.Out",
      onComplete: () => this.destroyFx(label)
    });
  }

  destroyFx(sprite) {
    if (!sprite || sprite.destroyed) return;
    this.tweens.killTweensOf(sprite);
    this.fxSprites.delete(sprite);
    sprite.destroy();
  }

  clearEffects() {
    [...this.fxSprites].forEach((sprite) => this.destroyFx(sprite));
    this.children.list
      .filter((child) => child.isFxSprite)
      .forEach((child) => this.destroyFx(child));
  }

  symbolKey(tile) {
    if (tile.special === "stripeRow") return "sym-stripe-row";
    if (tile.special === "stripeCol") return "sym-stripe-col";
    if (tile.special === "bomb") return "sym-bomb";
    if (tile.special === "chocolate") return "sym-chocolate";
    return `sym-${tile.type}`;
  }

  addPixelFrame(x, y, w, h, options = {}) {
    const group = this.add.group();
    const pink = options.pink || 0xff8fc7;
    const blue = options.blue || 0x8ee8ff;
    const yellow = options.yellow || 0xffe277;
    const bg = options.bg || 0x653184;
    const bgAlpha = options.bgAlpha ?? 0.58;
    const t = options.thickness || 4;
    const add = (item) => {
      group.add(item);
      return item;
    };
    add(this.add.rectangle(x, y, w, h, bg, bgAlpha));
    add(this.add.rectangle(x, y - h / 2 + t / 2, w, t, pink, 1));
    add(this.add.rectangle(x, y + h / 2 - t / 2, w, t, pink, 1));
    add(this.add.rectangle(x - w / 2 + t / 2, y, t, h, pink, 1));
    add(this.add.rectangle(x + w / 2 - t / 2, y, t, h, pink, 1));
    add(this.add.rectangle(x - w / 2 + 22, y - h / 2 + t + 2, 42, 3, blue, 1));
    add(this.add.rectangle(x + w / 2 - 38, y + h / 2 - t - 2, 54, 3, blue, 1));
    add(this.add.rectangle(x - w / 2 + 54, y + h / 2 - t - 2, 48, 3, yellow, 1));
    add(this.add.rectangle(x + w / 2 - 16, y - h / 2 + 16, 12, 12, yellow, 1));
    add(this.add.rectangle(x - w / 2 + 16, y + h / 2 - 16, 12, 12, blue, 1));
    add(this.add.rectangle(x - w / 2 + 16, y - h / 2 + 16, 8, 8, 0xffffff, 0.65));
    add(this.add.rectangle(x + w / 2 - 16, y + h / 2 - 16, 8, 8, 0xffffff, 0.55));
    return group;
  }

  createUi() {
    this.logoShadow = this.add.text(W / 2 + 4, 34, "CANDY", {
      fontFamily: "Trebuchet MS",
      fontSize: 42,
      fontStyle: "900",
      color: "#9b3a00",
      stroke: "#4b125b",
      strokeThickness: 8
    }).setOrigin(0.5);
    this.titleText = this.add.text(W / 2, 29, "CANDY", {
      fontFamily: "Trebuchet MS",
      fontSize: 42,
      fontStyle: "900",
      color: "#ffdf3f",
      stroke: "#ffffff",
      strokeThickness: 5
    }).setOrigin(0.5);
    this.logoRibbon = this.add.rectangle(W / 2, 68, 206, 28, 0xa51ddb).setStrokeStyle(2, 0xff85ff, 0.95);
    this.logoSubText = this.add.text(W / 2, 67, "ORDERS", {
      fontFamily: "Trebuchet MS",
      fontSize: 24,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#4b125b",
      strokeThickness: 4
    }).setOrigin(0.5);
    this.ordersHeader = this.add.text(W / 2, 88, "TODAY'S ORDERS", {
      fontSize: 15,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.walletText = this.add.text(W / 2, 266, "", {
      fontSize: 18,
      fontStyle: "800",
      color: "#ffffff",
      stroke: "#2b1248",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.betMinus = this.add.rectangle(92, 354, 58, 58, 0xff4f88).setStrokeStyle(3, 0xffffff, 0.9);
    this.betMinusText = this.add.text(92, 352, "-", {
      fontSize: 38,
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.betText = this.add.text(W / 2, 354, "", {
      fontSize: 28,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#2b1248",
      strokeThickness: 4
    }).setOrigin(0.5);
    this.betPlus = this.add.rectangle(313, 354, 58, 58, 0x45d66f).setStrokeStyle(3, 0xffffff, 0.9);
    this.betPlusText = this.add.text(313, 352, "+", {
      fontSize: 38,
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.betMinus.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.adjustBet(-BET_STEP));
    this.betPlus.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.adjustBet(BET_STEP));

    this.orderRows = [];
    for (let i = 0; i < 3; i++) {
      const y = 102 + i * 46;
      const frameArt = this.addPixelFrame(W / 2, y + 11, W - 30, 39, { bg: 0x6b3488, bgAlpha: 0.78, thickness: 3 });
      const panel = this.add.rectangle(W / 2, y + 11, W - 74, 27, 0x7a3a93, 1);
      const dotA = this.add.rectangle(68, y - 3, 8, 8, i === 0 ? 0xff78bf : i === 1 ? 0x5df2ff : 0xfff06a);
      const dotB = this.add.rectangle(W - 72, y + 23, 8, 8, i === 0 ? 0xfff06a : i === 1 ? 0xff78bf : 0x5df2ff);
      const icon = this.add.text(34, y + 10, "", { fontSize: 24 }).setOrigin(0.5).setVisible(false);
      const label = this.add.text(84, y + 1, "", { fontSize: 14, fontStyle: "800", color: "#fff" });
      const progress = this.add.text(84, y + 17, "", {
        fontSize: 12,
        fontStyle: "800",
        color: "#fff4b8",
        stroke: "#351352",
        strokeThickness: 2
      });
      const reward = this.add.text(W - 48, y + 10, "", {
        fontSize: 17,
        fontStyle: "900",
        color: "#8b2cff",
        backgroundColor: "#fff4b8",
        padding: { x: 8, y: 2 }
      }).setOrigin(0.5);
      this.orderRows.push({ frameArt, panel, dotA, dotB, icon, label, progress, reward, iconGroup: null });
    }

    this.statusText = this.add.text(W / 2, 252, "Choose bet, then start", {
      fontSize: 17,
      fontStyle: "800",
      color: "#ffffff",
      stroke: "#31164c",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.mainButton = this.add.rectangle(W / 2, 472, 236, 64, 0xffd94c).setStrokeStyle(4, 0xffffff, 0.95);
    this.mainButton.setInteractive({ useHandCursor: true });
    this.mainLabel = this.add.text(W / 2, 472, "START", {
      fontSize: 30,
      fontStyle: "900",
      color: "#5c1d7f",
      stroke: "#ffffff",
      strokeThickness: 3
    }).setOrigin(0.5);
    this.mainButton.on("pointerdown", () => {
      if (!this.busy && !this.sessionActive) this.startSession();
    });

    this.winText = this.add.text(W / 2, 593, "", {
      fontSize: 18,
      fontStyle: "900",
      color: "#fff9cb",
      align: "center",
      stroke: "#351352",
      strokeThickness: 5
    }).setOrigin(0.5);

    this.statusFrameArt = this.addPixelFrame(W / 2, 650, W - 28, 112, { bg: 0x462476, bgAlpha: 0.82, thickness: 4 });
    this.gameWalletText = this.add.text(26, 642, "", {
      fontSize: 18,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 5
    });
    this.gameBetText = this.add.text(W - 26, 642, "", {
      fontSize: 18,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 5
    }).setOrigin(1, 0);
    this.stepsText = this.add.text(W / 2, 642, "", {
      fontSize: 18,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#351352",
      strokeThickness: 5
    }).setOrigin(0.5, 0);
  }

  createBoardFrame() {
    this.boardFrameItems = [];
    const boardFrame = this.addPixelFrame(W / 2, this.boardY + this.cell * ROWS / 2, this.cell * COLS + 24, this.cell * ROWS + 24, { bg: 0x4f2478, bgAlpha: 0.92, thickness: 5 });
    this.boardFrameItems.push(boardFrame);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.boardFrameItems.push(this.add.rectangle(this.cellX(c), this.cellY(r), this.cell - 5, this.cell - 5, 0x2f1555, 0.54).setStrokeStyle(1, 0xffffff, 0.16));
      }
    }
  }

  setBoardVisible(visible) {
    this.boardFrameItems.forEach((item) => item.setVisible(visible));
    this.sprites.flat().forEach((sprite) => {
      if (sprite) sprite.getChildren().forEach((child) => child.setVisible(visible));
    });
  }

  showPreStart() {
    this.closePopup();
    this.clearEffects();
    this.clearOrderIcons();
    this.busy = false;
    this.resolvingMove = false;
    this.sessionActive = false;
    this.inputOpen = false;
    this.input.setDefaultCursor("none");
    this.clearSelection();
    this.movesMade = 0;
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.orders = [];
    this.clearSprites();
    this.betAmount = Phaser.Math.Clamp(this.betAmount, MIN_BET, Math.max(MIN_BET, Math.min(MAX_BET, this.wallet)));
    this.winText.setText("");
    this.statusText.setText("Choose bet, then start");
    this.orderRows.forEach((row, i) => {
      row.panel.setFillStyle(0xffffff, 0.11);
      row.icon.setText("-");
      row.label.setText(i === 0 ? "Easy order appears after start" : i === 1 ? "Medium order appears after start" : "Hard order appears after start");
      row.progress.setText("Progress locked");
      row.reward.setText("--");
    });
    this.updateBetUi();
    this.setMode("bet");
  }

  startSession() {
    if (this.wallet < this.betAmount) {
      this.statusText.setText("Not enough wallet");
      return;
    }
    this.startCuteMusic();
    this.closePopup();
    this.clearEffects();
    this.clearOrderIcons();
    this.busy = false;
    this.resolvingMove = false;
    this.sessionActive = true;
    this.inputOpen = true;
    this.selected = null;
    this.movesMade = 0;
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.winText.setText("");
    this.statusText.setText("Solve orders in 12 moves");
    this.generateOrders();
    this.generateBoard();
    this.renderBoard(true);
    this.updateOrders();
    this.updateBetUi();
    this.setMode("game");
  }

  setMode(mode) {
    const isBet = mode === "bet";
    [this.walletText, this.betMinus, this.betMinusText, this.betText, this.betPlus, this.betPlusText, this.mainButton, this.mainLabel]
      .forEach((item) => item.setVisible(isBet));
    this.ordersHeader.setVisible(!isBet);
    this.orderRows.forEach((row) => Object.values(row).forEach((item) => {
      if (item && item.setVisible) item.setVisible(!isBet);
    }));
    this.statusText.setVisible(!isBet);
    this.winText.setVisible(!isBet);
    this.statusFrameArt.setVisible(!isBet);
    this.gameWalletText.setVisible(!isBet);
    this.gameBetText.setVisible(!isBet);
    this.stepsText.setVisible(!isBet);
    this.setBoardVisible(!isBet);
  }

  adjustBet(delta) {
    if (this.sessionActive || this.busy) return;
    const cap = Math.min(MAX_BET, this.wallet);
    this.betAmount = Phaser.Math.Clamp(this.betAmount + delta, MIN_BET, cap);
    this.updateBetUi();
  }

  updateBetUi() {
    this.walletText.setText(`WALLET ${this.wallet}`);
    this.betText.setText(`BET ${this.betAmount}`);
    this.gameWalletText.setText(`WALLET ${this.wallet}`);
    this.gameBetText.setText(`BET ${this.betAmount}`);
    this.stepsText.setText(`${MAX_MOVES - this.movesMade}/${MAX_MOVES}`);
    this.betMinus.setFillStyle(0xff4f88);
    this.betPlus.setFillStyle(0x45d66f);
    this.mainLabel.setText("START");
    this.mainButton.setFillStyle(0xffd94c);
  }

  generateOrders() {
    const easyType = Phaser.Utils.Array.GetRandom(TYPES);
    const mediumPool = [...TYPES.map((type) => ({ kind: "color", type, need: 10, mult: 8 })), { kind: "any", need: 18, mult: 9 }];
    const hardPool = [
      ...TYPES.map((type) => ({ kind: "color", type, need: 16, mult: 18 })),
      { kind: "chocolate", need: 2, mult: 22 },
      { kind: "cascade", need: 4, mult: 25 }
    ];
    this.orders = [
      { tier: "Easy", kind: "color", type: easyType, need: 5, mult: 3 },
      { tier: "Medium", ...Phaser.Utils.Array.GetRandom(mediumPool) },
      { tier: "Hard", ...Phaser.Utils.Array.GetRandom(hardPool) }
    ];
  }

  generateBoard() {
    this.clearSprites();
    do {
      this.board = [];
      for (let r = 0; r < ROWS; r++) {
        this.board[r] = [];
        for (let c = 0; c < COLS; c++) {
          this.board[r][c] = this.randomTile();
        }
      }
    } while (this.findMatches().length > 0);
  }

  randomTile() {
    return { type: Phaser.Utils.Array.GetRandom(TYPES), special: null };
  }

  clearSprites() {
    if (!this.sprites) this.sprites = [];
    this.clearEffects();
    [...this.allCandySprites].forEach((s) => this.destroyCandySprite(s));
    this.children.list
      .filter((child) => child.isBoardSymbol)
      .forEach((child) => {
        this.tweens.killTweensOf(child);
        child.destroy();
      });
    this.sprites = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  destroyCandySprite(sprite) {
    if (!sprite) return;
    sprite.getChildren().forEach((child) => {
      this.tweens.killTweensOf(child);
      if (child.disableInteractive) child.disableInteractive();
      child.destroy();
    });
    this.allCandySprites.delete(sprite);
    sprite.destroy();
  }

  renderBoard(instant = false) {
    this.clearSprites();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r][c];
        if (tile) this.sprites[r][c] = this.createCandySprite(tile, r, c, instant);
      }
    }
  }

  addBlock(group, x, y, dx, dy, w, h, color, alpha = 1) {
    const block = this.add.rectangle(Math.round(x + dx), Math.round(y + dy), w, h, color, alpha).setOrigin(0, 0);
    group.add(block);
    return block;
  }

  drawPixelCandy(group, tile, x, y, scale = 1) {
    const px = (v) => Math.round(v * scale);
    const ox = -22 * scale;
    const oy = -22 * scale;
    const color = tile.special === "chocolate" ? COLORS.chocolate : COLORS[tile.type];
    const dark = 0x3a1638;
    const light = 0xffffff;
    this.addBlock(group, x, y, ox + px(4), oy + px(8), px(36), px(32), 0x21102e, 0.25);

    if (tile.type === "green" && !tile.special) {
      this.addBlock(group, x, y, ox + px(8), oy + px(6), px(10), px(10), dark);
      this.addBlock(group, x, y, ox + px(26), oy + px(6), px(10), px(10), dark);
      this.addBlock(group, x, y, ox + px(10), oy + px(8), px(8), px(8), color);
      this.addBlock(group, x, y, ox + px(26), oy + px(8), px(8), px(8), color);
      this.addBlock(group, x, y, ox + px(7), oy + px(14), px(30), px(28), dark);
      this.addBlock(group, x, y, ox + px(10), oy + px(16), px(24), px(24), color);
      this.addBlock(group, x, y, ox + px(15), oy + px(20), px(4), px(4), 0x1a1020);
      this.addBlock(group, x, y, ox + px(27), oy + px(20), px(4), px(4), 0x1a1020);
      this.addBlock(group, x, y, ox + px(19), oy + px(29), px(8), px(3), 0x1a1020);
    } else if (tile.type === "yellow" && !tile.special) {
      this.addBlock(group, x, y, ox + px(2), oy + px(15), px(10), px(18), dark);
      this.addBlock(group, x, y, ox + px(34), oy + px(15), px(10), px(18), dark);
      this.addBlock(group, x, y, ox + px(4), oy + px(17), px(8), px(14), 0xfff0a0);
      this.addBlock(group, x, y, ox + px(34), oy + px(17), px(8), px(14), 0xfff0a0);
      this.addBlock(group, x, y, ox + px(10), oy + px(9), px(26), px(34), dark);
      this.addBlock(group, x, y, ox + px(13), oy + px(12), px(20), px(28), color);
      this.addBlock(group, x, y, ox + px(19), oy + px(12), px(4), px(28), 0xfff7b8, 0.75);
    } else if (tile.type === "purple" && !tile.special) {
      this.addBlock(group, x, y, ox + px(8), oy + px(10), px(30), px(30), dark);
      this.addBlock(group, x, y, ox + px(11), oy + px(12), px(24), px(24), color);
      this.addBlock(group, x, y, ox + px(3), oy + px(24), px(40), px(6), 0xffd28f, 0.95);
      this.addBlock(group, x, y, ox + px(7), oy + px(26), px(32), px(4), 0x8b5dff, 0.65);
    } else if (tile.type === "blue" && !tile.special) {
      this.addBlock(group, x, y, ox + px(20), oy + px(30), px(6), px(16), dark);
      this.addBlock(group, x, y, ox + px(21), oy + px(31), px(4), px(13), 0xffe0d3);
      this.addBlock(group, x, y, ox + px(8), oy + px(5), px(30), px(30), dark);
      this.addBlock(group, x, y, ox + px(11), oy + px(8), px(24), px(24), color);
      this.addBlock(group, x, y, ox + px(17), oy + px(13), px(14), px(4), 0xbcecff);
      this.addBlock(group, x, y, ox + px(17), oy + px(21), px(14), px(4), 0xbcecff);
    } else {
      this.addBlock(group, x, y, ox + px(10), oy + px(8), px(26), px(34), dark);
      this.addBlock(group, x, y, ox + px(13), oy + px(10), px(20), px(30), color);
      this.addBlock(group, x, y, ox + px(16), oy + px(12), px(14), px(4), 0xffa4b3, 0.85);
      this.addBlock(group, x, y, ox + px(15), oy + px(34), px(16), px(4), 0xffb8c3, 0.45);
    }

    this.addBlock(group, x, y, ox + px(14), oy + px(11), px(7), px(5), light, 0.7);

    if (tile.special === "stripeRow" || tile.special === "stripeCol") {
      const stripeColor = 0xffffff;
      if (tile.special === "stripeRow") {
        this.addBlock(group, x, y, ox + px(10), oy + px(17), px(26), px(5), stripeColor, 0.9);
        this.addBlock(group, x, y, ox + px(10), oy + px(29), px(26), px(5), stripeColor, 0.9);
      } else {
        this.addBlock(group, x, y, ox + px(16), oy + px(9), px(5), px(33), stripeColor, 0.9);
        this.addBlock(group, x, y, ox + px(28), oy + px(9), px(5), px(33), stripeColor, 0.9);
      }
    }
    if (tile.special === "bomb") {
      this.addBlock(group, x, y, ox + px(8), oy + px(12), px(30), px(28), 0x7ed7ff);
      this.addBlock(group, x, y, ox + px(12), oy + px(16), px(22), px(20), 0xff5aa7);
      this.addBlock(group, x, y, ox + px(18), oy + px(8), px(8), px(8), 0xfff06a);
      this.addBlock(group, x, y, ox + px(20), oy + px(4), px(4), px(6), 0xfff06a);
      this.addBlock(group, x, y, ox + px(15), oy + px(23), px(16), px(5), 0xffffff, 0.85);
    }
    if (tile.special === "chocolate") {
      this.addBlock(group, x, y, ox + px(8), oy + px(8), px(32), px(34), 0x3a1d12);
      this.addBlock(group, x, y, ox + px(11), oy + px(11), px(26), px(28), 0x7a3f23);
      this.addBlock(group, x, y, ox + px(12), oy + px(24), px(24), px(3), 0x2a120b, 0.8);
      this.addBlock(group, x, y, ox + px(23), oy + px(12), px(3), px(26), 0x2a120b, 0.8);
      this.addBlock(group, x, y, ox + px(14), oy + px(13), px(7), px(5), 0xd98b4a, 0.75);
    }
  }

  createCandySprite(tile, r, c, instant = false, startY = null) {
    const x = this.cellX(c);
    const y = startY === null ? this.cellY(r) : startY;
    const g = this.add.group();
    const hit = this.add.circle(x, y, 24, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.tileRef = tile;
    hit.row = r;
    hit.col = c;

    const img = this.add.image(x, y, this.symbolKey(tile));
    img.setScale(50 / Math.max(img.width, img.height));
    img.isBoardSymbol = true;
    hit.isBoardSymbol = true;
    g.addMultiple([img, hit]);

    hit.on("pointerdown", () => this.onTileTap(hit.row, hit.col));
    g.getChildren().forEach((child) => {
      child.row = r;
      child.col = c;
      if (!instant) {
        const baseScaleX = child.scaleX;
        const baseScaleY = child.scaleY;
        child.setScale(baseScaleX * 0.7, baseScaleY * 0.7);
        this.tweens.add({
          targets: child,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          duration: 170,
          ease: "Back.Out"
        });
      }
    });
    g.x = 0;
    g.y = 0;
    this.allCandySprites.add(g);
    return g;
  }

  specialMark(tile) {
    if (tile.special === "stripeRow") return "-";
    if (tile.special === "stripeCol") return "|";
    if (tile.special === "bomb") return "B";
    if (tile.special === "chocolate") return "C";
    return "";
  }

  onTileTap(r, c) {
    if (!this.inputOpen || this.busy || this.resolvingMove) return;
    const tile = this.board[r][c];
    if (!tile) return;
    if (!this.selected) {
      this.selectTile(r, c);
      return;
    }
    const prev = this.selected;
    if (prev.r === r && prev.c === c) {
      this.clearSelection();
      return;
    }
    if (Math.abs(prev.r - r) + Math.abs(prev.c - c) !== 1) {
      this.clearSelection();
      this.selectTile(r, c);
      return;
    }
    this.clearSelection();
    this.performMove(prev.r, prev.c, r, c);
  }

  selectTile(r, c) {
    this.selected = { r, c };
    this.selection = this.add.rectangle(this.cellX(c), this.cellY(r), this.cell - 4, this.cell - 4, 0xffffff, 0)
      .setStrokeStyle(4, 0xfff36a, 1);
  }

  clearSelection() {
    if (this.selection) this.selection.destroy();
    this.selection = null;
    this.selected = null;
  }

  moveSpriteTo(sprite, r, c, duration = 220) {
    if (!sprite) return;
    const children = sprite.getChildren();
    const hit = children[children.length - 1];
    const dx = this.cellX(c) - hit.x;
    const dy = this.cellY(r) - hit.y;
    children.forEach((child) => {
      child.row = r;
      child.col = c;
      this.tweens.add({
        targets: child,
        x: child.x + dx,
        y: child.y + dy,
        duration,
        ease: "Cubic.Out"
      });
    });
  }

  async performMove(r1, c1, r2, c2) {
    if (!this.sessionActive) return;
    if (this.resolvingMove) return;
    this.resolvingMove = true;
    if (this.wallet < this.betAmount) {
      this.resolvingMove = false;
      await this.finishSession("Wallet empty");
      return;
    }
    this.inputOpen = false;
    this.busy = true;
    this.statusText.setText("Checking move...");
    const a = this.board[r1][c1];
    const b = this.board[r2][c2];
    const spriteA = this.sprites[r1][c1];
    const spriteB = this.sprites[r2][c2];
    this.board[r1][c1] = b;
    this.board[r2][c2] = a;
    this.sprites[r1][c1] = spriteB;
    this.sprites[r2][c2] = spriteA;
    this.moveSpriteTo(spriteB, r1, c1, 190);
    this.moveSpriteTo(spriteA, r2, c2, 190);
    await this.wait(210);

    const specialSwap = a.special || b.special;
    if (!specialSwap && this.findMatches().length === 0) {
      this.board[r1][c1] = a;
      this.board[r2][c2] = b;
      this.sprites[r1][c1] = spriteA;
      this.sprites[r2][c2] = spriteB;
      this.moveSpriteTo(spriteA, r1, c1, 170);
      this.moveSpriteTo(spriteB, r2, c2, 170);
      await this.wait(190);
      this.statusText.setText("No match. Pick another swap.");
      this.busy = false;
      this.resolvingMove = false;
      this.inputOpen = true;
      return;
    }

    this.wallet -= this.betAmount;
    this.movesMade += 1;
    this.updateBetUi();
    this.statusText.setText("Resolving...");

    if (specialSwap) {
      await this.activateMovedSpecials(a, b, [[r1, c1], [r2, c2]]);
    }

    await this.resolveAll();
    await this.finishMove();
  }

  async activateMovedSpecials(a, b, positions) {
    const remove = new Set();
    const fxWaits = [];
    const [posA, posB] = positions;
    const addBySpecial = (tile, pos, otherTile) => {
      const [r, c] = pos;
      fxWaits.push(this.playSpecialActivationFx(tile, pos, otherTile));
      remove.add(`${r},${c}`);
      if (tile.special === "stripeRow") {
        for (let cc = 0; cc < COLS; cc++) remove.add(`${r},${cc}`);
      } else if (tile.special === "stripeCol") {
        for (let rr = 0; rr < ROWS; rr++) remove.add(`${rr},${c}`);
      } else if (tile.special === "bomb") {
        for (let rr = Math.max(0, r - 1); rr <= Math.min(ROWS - 1, r + 1); rr++) {
          for (let cc = Math.max(0, c - 1); cc <= Math.min(COLS - 1, c + 1); cc++) {
            remove.add(`${rr},${cc}`);
          }
        }
      } else if (tile.special === "chocolate") {
        const color = TYPES.includes(otherTile.type) ? otherTile.type : tile.type;
        for (let rr = 0; rr < ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            if (this.board[rr][cc] && this.board[rr][cc].type === color) remove.add(`${rr},${cc}`);
          }
        }
      }
    };
    if (a.special) addBySpecial(a, posB, b);
    if (b.special) addBySpecial(b, posA, a);
    this.expandSpecialRemoval(remove);
    if (fxWaits.length) await Promise.all(fxWaits);
    await this.removePositions(remove, null);
    await this.collapseAndFill();
  }

  async activateChocolate(color, positions) {
    if (!TYPES.includes(color)) return;
    const remove = new Set();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] && this.board[r][c].type === color) remove.add(`${r},${c}`);
      }
    }
    positions.forEach(([r, c]) => remove.add(`${r},${c}`));
    await Promise.all(positions.map(([r, c]) => this.playChocolateFx(r, c, color)));
    await this.removePositions(remove, null);
    await this.collapseAndFill();
  }

  async resolveAll() {
    let wave = 0;
    while (true) {
      const matches = this.findMatches();
      if (matches.length === 0) break;
      if (wave > 0) {
        this.cascadeCount += 1;
        this.showComboText(wave + 1);
        this.playPopSound(720 + wave * 70);
      }
      await this.resolveMatches(matches);
      await this.collapseAndFill();
      this.updateOrders();
      wave += 1;
      if (wave > 20) break;
    }
  }

  findMatches() {
    const groups = [];
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        const start = c;
        const type = this.matchableType(r, c);
        while (c < COLS && this.matchableType(r, c) === type && type) c++;
        if (type && c - start >= 3) {
          groups.push({ dir: "h", cells: Array.from({ length: c - start }, (_, i) => [r, start + i]) });
        }
        if (!type) c++;
      }
    }
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < ROWS) {
        const start = r;
        const type = this.matchableType(r, c);
        while (r < ROWS && this.matchableType(r, c) === type && type) r++;
        if (type && r - start >= 3) {
          groups.push({ dir: "v", cells: Array.from({ length: r - start }, (_, i) => [start + i, c]) });
        }
        if (!type) r++;
      }
    }
    return groups;
  }

  matchableType(r, c) {
    const tile = this.board[r]?.[c];
    if (!tile || tile.special === "chocolate") return null;
    return tile.type;
  }

  async resolveMatches(matches) {
    const remove = new Set();
    const create = [];
    const cellHits = new Map();

    for (const group of matches) {
      const cells = group.cells;
      cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        const hit = cellHits.get(key) || { r, c, count: 0, max: 0, dirs: new Set() };
        hit.count += 1;
        hit.max = Math.max(hit.max, cells.length);
        hit.dirs.add(group.dir);
        cellHits.set(key, hit);
      });

      cells.forEach(([r, c]) => remove.add(`${r},${c}`));
    }

    const bombHit = [...cellHits.values()].find((hit) => hit.dirs.size > 1);
    if (bombHit) {
      create.push({ r: bombHit.r, c: bombHit.c, special: "bomb", type: this.board[bombHit.r][bombHit.c].type });
    } else {
      const longHit = [...cellHits.values()].find((hit) => hit.max >= 5);
      if (longHit) {
        create.push({ r: longHit.r, c: longHit.c, special: "chocolate", type: this.board[longHit.r][longHit.c].type });
        this.chocolatesCreated += 1;
      } else {
        const stripeHit = [...cellHits.values()].find((hit) => hit.max === 4);
        if (stripeHit) {
          const dir = stripeHit.dirs.has("h") ? "stripeRow" : "stripeCol";
          create.push({ r: stripeHit.r, c: stripeHit.c, special: dir, type: this.board[stripeHit.r][stripeHit.c].type });
        }
      }
    }

    create.forEach(({ r, c }) => remove.delete(`${r},${c}`));
    this.expandSpecialRemoval(remove);
    await this.removePositions(remove, create);
    for (const made of create) {
      const oldSprite = this.sprites[made.r]?.[made.c];
      if (oldSprite) this.destroyCandySprite(oldSprite);
      this.board[made.r][made.c] = { type: made.type, special: made.special };
      this.sprites[made.r][made.c] = this.createCandySprite(this.board[made.r][made.c], made.r, made.c, false);
    }
    await this.wait(140);
  }

  expandSpecialRemoval(remove) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const key of [...remove]) {
        const [r, c] = key.split(",").map(Number);
        const tile = this.board[r]?.[c];
        if (!tile || !tile.special) continue;
        if (tile.special === "stripeRow") {
          for (let cc = 0; cc < COLS; cc++) {
            const next = `${r},${cc}`;
            if (!remove.has(next)) {
              remove.add(next);
              changed = true;
            }
          }
        }
        if (tile.special === "stripeCol") {
          for (let rr = 0; rr < ROWS; rr++) {
            const next = `${rr},${c}`;
            if (!remove.has(next)) {
              remove.add(next);
              changed = true;
            }
          }
        }
        if (tile.special === "bomb") {
          for (let rr = Math.max(0, r - 1); rr <= Math.min(ROWS - 1, r + 1); rr++) {
            for (let cc = Math.max(0, c - 1); cc <= Math.min(COLS - 1, c + 1); cc++) {
              const next = `${rr},${cc}`;
              if (!remove.has(next)) {
                remove.add(next);
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  async removePositions(remove, create) {
    const targets = [];
    const removedSprites = [];
    for (const key of remove) {
      const [r, c] = key.split(",").map(Number);
      const tile = this.board[r][c];
      if (!tile) continue;
      this.totalRemoved += 1;
      if (this.removedByColor[tile.type] !== undefined) this.removedByColor[tile.type] += 1;
      const sprite = this.sprites[r]?.[c];
      if (sprite) {
        sprite.getChildren().forEach((child) => targets.push(child));
        removedSprites.push(sprite);
        this.sprites[r][c] = null;
      }
      this.board[r][c] = null;
    }
    this.updateOrders();
    if (targets.length) {
      this.playPopSound(480 + Math.min(this.totalRemoved, 20) * 18);
      for (const key of [...remove].slice(0, 10)) {
        const [rr, cc] = key.split(",").map(Number);
        this.burstAt(this.cellX(cc), this.cellY(rr), 0xfff06a);
      }
      this.tweens.add({ targets, scale: 1.35, alpha: 0, duration: 210, ease: "Cubic.In" });
      await this.wait(230);
    }
    removedSprites.forEach((sprite) => {
      this.destroyCandySprite(sprite);
    });
    if (create) {
      create.forEach(({ r, c, type, special }) => {
        this.board[r][c] = { type, special };
      });
    }
  }

  async collapseAndFill() {
    const nextBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const nextSprites = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let c = 0; c < COLS; c++) {
      const stack = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r][c]) stack.push({ tile: this.board[r][c], sprite: this.sprites[r][c] });
      }
      let writeRow = ROWS - 1;
      for (const item of stack) {
        nextBoard[writeRow][c] = item.tile;
        nextSprites[writeRow][c] = item.sprite;
        this.moveSpriteTo(item.sprite, writeRow, c, 260);
        writeRow -= 1;
      }
      let spawnIndex = 0;
      for (let r = writeRow; r >= 0; r--) {
        const tile = this.randomTile();
        const startY = this.cellY(-1 - spawnIndex);
        const sprite = this.createCandySprite(tile, r, c, true, startY);
        nextBoard[r][c] = tile;
        nextSprites[r][c] = sprite;
        this.moveSpriteTo(sprite, r, c, 320 + spawnIndex * 35);
        spawnIndex += 1;
      }
    }
    this.board = nextBoard;
    this.sprites = nextSprites;
    await this.wait(380);
  }

  updateOrders() {
    this.orders.forEach((order, i) => {
      const row = this.orderRows[i];
      const progress = this.orderProgress(order);
      const done = progress >= order.need;
      row.panel.setFillStyle(done ? 0xfff2a8 : 0xffffff, done ? 0.32 : 0.14);
      this.drawOrderIcon(row, order, 46, 113 + i * 46);
      row.label.setText(`${order.tier.toUpperCase()}  x${order.need}`);
      row.progress.setText(`${Math.min(progress, order.need)}/${order.need}`);
      row.reward.setText(`${order.mult}x`);
    });
  }

  clearOrderIcons() {
    this.orderRows.forEach((row) => {
      if (row.iconGroup) {
        row.iconGroup.getChildren().forEach((child) => {
          this.tweens.killTweensOf(child);
          child.destroy();
        });
        row.iconGroup.destroy();
        row.iconGroup = null;
      }
    });
    this.children.list
      .filter((child) => child.isOrderIcon)
      .forEach((child) => {
        this.tweens.killTweensOf(child);
        child.destroy();
      });
  }

  drawOrderIcon(row, order, x, y) {
    if (row.iconGroup) {
      row.iconGroup.getChildren().forEach((child) => child.destroy());
      row.iconGroup.destroy();
    }
    row.iconGroup = this.add.group();
    if (order.kind === "color") {
      const iconImg = this.add.image(x, y, this.symbolKey({ type: order.type, special: null }));
      iconImg.setScale(30 / Math.max(iconImg.width, iconImg.height));
      row.iconGroup.add(iconImg);
    } else if (order.kind === "chocolate") {
      const iconImg = this.add.image(x, y, "sym-chocolate");
      iconImg.setScale(30 / Math.max(iconImg.width, iconImg.height));
      row.iconGroup.add(iconImg);
    } else if (order.kind === "cascade") {
      this.addBlock(row.iconGroup, x, y, -16, -12, 10, 10, 0x6ee8ff);
      this.addBlock(row.iconGroup, x, y, -6, -4, 10, 10, 0x6ee8ff);
      this.addBlock(row.iconGroup, x, y, 4, 4, 10, 10, 0x6ee8ff);
      this.addBlock(row.iconGroup, x, y, -1, 13, 8, 8, 0xffffff);
    } else {
      ["red", "blue", "yellow"].forEach((type, idx) => {
        const iconImg = this.add.image(x - 13 + idx * 13, y, this.symbolKey({ type, special: null }));
        iconImg.setScale(18 / Math.max(iconImg.width, iconImg.height));
        row.iconGroup.add(iconImg);
      });
    }
    row.iconGroup.getChildren().forEach((child) => {
      child.isOrderIcon = true;
    });
    row.iconGroup.setVisible(this.sessionActive);
  }

  orderProgress(order) {
    if (order.kind === "color") return this.removedByColor[order.type] || 0;
    if (order.kind === "any") return this.totalRemoved;
    if (order.kind === "cascade") return this.cascadeCount;
    if (order.kind === "chocolate") return this.chocolatesCreated;
    return 0;
  }

  orderName(order) {
    if (order.kind === "color") return `Collect ${order.need} ${LABELS[order.type]}`;
    if (order.kind === "any") return "Collect Any Candies";
    if (order.kind === "cascade") return "Trigger Cascades";
    return "Create Chocolate";
  }

  orderIcon(order) {
    if (order.kind === "color") return LABELS[order.type][0];
    if (order.kind === "any") return "A";
    if (order.kind === "cascade") return "C";
    return "*";
  }

  async finishMove() {
    this.updateOrders();
    const payout = this.calculatePayout();
    this.winText.setText(`TOTAL ${payout.totalMult}x  WIN ${payout.reward}`);
    await this.wait(260);
    if (payout.completed === 3) {
      await this.finishSession("All orders completed");
      return;
    }
    if (this.movesMade >= MAX_MOVES) {
      await this.finishSession(payout.completed > 0 ? "12 moves finished" : "No orders completed");
      return;
    }
    if (this.wallet < this.betAmount) {
      await this.finishSession("Wallet empty");
      return;
    }
    this.statusText.setText(payout.completed > 0 ? "Order hit. Keep solving." : "No order yet. Keep moving.");
    this.busy = false;
    this.resolvingMove = false;
    this.inputOpen = true;
    this.updateBetUi();
  }

  async finishSession(reason) {
    this.endReason = reason;
    this.sessionActive = false;
    this.inputOpen = false;
    this.busy = false;
    this.resolvingMove = false;
    this.clearSelection();
    this.updateOrders();
    const payout = this.calculatePayout();
    this.wallet += payout.reward;
    this.statusText.setText(reason);
    this.winText.setText(`FINAL ${payout.totalMult}x  WIN ${payout.reward}`);
    this.updateBetUi();
    await this.wait(160);
    this.clearEffects();
    this.showPopup(payout);
  }

  calculatePayout() {
    const baseMult = this.baseMultiplier(this.totalRemoved);
    const completed = this.orders.filter((o) => this.orderProgress(o) >= o.need);
    const orderMult = completed.reduce((sum, o) => sum + o.mult, 0);
    const perfectMult = completed.length === 3 ? 20 : 0;
    const totalMult = baseMult + orderMult + perfectMult;
    return {
      baseMult,
      orderMult,
      perfectMult,
      totalMult,
      reward: Math.round(totalMult * this.betAmount),
      removed: this.totalRemoved,
      cascades: this.cascadeCount,
      completed: completed.length,
      moves: this.movesMade,
      bet: this.betAmount,
      spent: this.movesMade * this.betAmount,
      wallet: this.wallet,
      reason: this.endReason
    };
  }

  baseMultiplier(n) {
    if (n >= 15) return 5;
    if (n >= 10) return 2;
    if (n >= 7) return 1;
    if (n >= 5) return 0.5;
    if (n >= 3) return 0.2;
    return 0;
  }

  showPopup(p) {
    this.closePopup();
    this.popup = this.add.group();
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x120926, 0.74);
    const panel = this.add.rectangle(W / 2, H / 2, 318, 364, 0x522474, 0.98);
    const inner = this.add.rectangle(W / 2, H / 2 + 10, 282, 258, 0x2f1555, 0.96);
    const topStripe = this.add.rectangle(W / 2, 264, 246, 5, 0x8ee8ff, 1);
    const bottomStripe = this.add.rectangle(W / 2, 478, 246, 5, 0xffe277, 1);
    const frame = this.addPixelFrame(W / 2, H / 2, 328, 374, { bg: 0x522474, bgAlpha: 0.18, thickness: 5 });
    const frameItems = frame.getChildren();
    const title = this.add.text(W / 2, 220, p.completed > 0 ? "ORDER HIT!" : "SESSION END", {
      fontSize: 36,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 6
    }).setOrigin(0.5);
    title.setShadow(3, 4, "#2b1248", 0, true, true);
    const lines = [
      `${p.reason}`,
      `Moves: ${p.moves}  Bet: ${p.bet}`,
      `Spent: ${p.spent}`,
      `Removed: ${p.removed} candies`,
      `Base Win: ${p.baseMult}x`,
      `Orders: ${p.completed}/3 = ${p.orderMult}x`,
      `Perfect Bonus: ${p.perfectMult}x`,
      `Total: ${p.totalMult}x`,
      `Reward: ${p.reward}`,
      `Wallet: ${this.wallet}`
    ];
    const body = this.add.text(W / 2, 348, lines.join("\n"), {
      fontSize: 16,
      fontStyle: "800",
      color: "#fff8d8",
      align: "center",
      lineSpacing: 8,
      stroke: "#1e0d38",
      strokeThickness: 3
    }).setOrigin(0.5);
    const next = this.add.rectangle(W / 2, 532, 202, 52, 0xff4f88).setStrokeStyle(3, 0xffffff);
    const nextText = this.add.text(W / 2, 532, "OK", {
      fontSize: 21,
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5);
    next.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.showPreStart());
    this.popup.addMultiple([veil, panel, inner, topStripe, bottomStripe, ...frameItems, title, body, next, nextText]);
    this.popup.getChildren().forEach((child) => {
      child.setAlpha(0);
      this.tweens.add({ targets: child, alpha: 1, duration: 180 });
    });
  }

  closePopup() {
    if (this.popup) {
      this.popup.getChildren().forEach((child) => {
        this.tweens.killTweensOf(child);
        child.destroy();
      });
      this.popup.destroy(true);
      this.popup = null;
    }
  }

  cellX(c) {
    return this.boardX + c * this.cell + this.cell / 2;
  }

  cellY(r) {
    return this.boardY + r * this.cell + this.cell / 2;
  }

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#221142",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: CandyOrdersScene
};

window.addEventListener("load", () => {
  window.candyGame = new Phaser.Game(config);
});
