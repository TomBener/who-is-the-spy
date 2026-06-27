var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-LTvnyM/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// ../shared/src/types.ts
var DEFAULT_CONFIG = {
  undercoverCount: 1,
  blankCount: 0,
  category: "random",
  descriptionTimer: 0,
  lang: "zh"
};
var MIN_PLAYERS = 3;
var MAX_PLAYERS = 16;
var ROOM_CODE_LENGTH = 4;

// ../shared/src/events.ts
var API_CREATE = "/api/create";
var API_JOIN = "/api/join";
var WS_PATH = "/ws";

// ../shared/src/categories.ts
var CATEGORIES = [
  { key: "random", label: { zh: "\u968F\u673A", en: "Random" } },
  { key: "food", label: { zh: "\u98DF\u7269", en: "Food" } },
  { key: "animals", label: { zh: "\u52A8\u7269", en: "Animals" } },
  { key: "daily", label: { zh: "\u65E5\u5E38\u7528\u54C1", en: "Daily Items" } },
  { key: "places", label: { zh: "\u5730\u70B9\u573A\u666F", en: "Places" } },
  { key: "people", label: { zh: "\u4EBA\u7269\u89D2\u8272", en: "People" } }
];
var CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

// src/do.ts
import { DurableObject } from "cloudflare:workers";

// src/room.ts
function newPlayer(id, name, isHost) {
  return {
    id,
    name,
    isHost,
    connected: true,
    alive: true,
    hasVoted: false,
    votesReceived: 0,
    role: null,
    word: null
  };
}
__name(newPlayer, "newPlayer");
function createRoom(code, host, config) {
  const room = {
    code,
    phase: "lobby",
    round: 0,
    config: { ...config },
    hostId: host.id,
    players: /* @__PURE__ */ new Map(),
    speakingOrder: [],
    currentSpeaker: 0,
    eliminated: null,
    winner: null,
    revealWords: null,
    votes: /* @__PURE__ */ new Map(),
    secretPair: null
  };
  room.players.set(host.id, newPlayer(host.id, host.name, true));
  return room;
}
__name(createRoom, "createRoom");
function reassignHost(room) {
  const players = [...room.players.values()];
  const next = players.find((p) => p.connected) ?? players[0];
  if (!next)
    return;
  for (const p of room.players.values())
    p.isHost = p.id === next.id;
  room.hostId = next.id;
}
__name(reassignHost, "reassignHost");
function toRoomState(room) {
  const players = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    connected: p.connected,
    alive: p.alive,
    hasVoted: p.hasVoted,
    votesReceived: p.votesReceived
  }));
  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    players,
    config: room.config,
    hostId: room.hostId,
    speakingOrder: room.speakingOrder,
    currentSpeaker: room.currentSpeaker,
    eliminated: room.eliminated,
    winner: room.winner,
    revealWords: room.revealWords
  };
}
__name(toRoomState, "toRoomState");
function serializeRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    config: room.config,
    hostId: room.hostId,
    players: [...room.players.values()],
    speakingOrder: room.speakingOrder,
    currentSpeaker: room.currentSpeaker,
    eliminated: room.eliminated,
    winner: room.winner,
    revealWords: room.revealWords,
    votes: [...room.votes.entries()],
    secretPair: room.secretPair
  };
}
__name(serializeRoom, "serializeRoom");
function deserializeRoom(obj) {
  const players = /* @__PURE__ */ new Map();
  for (const p of obj.players)
    players.set(p.id, p);
  return {
    code: obj.code,
    phase: obj.phase,
    round: obj.round,
    config: obj.config,
    hostId: obj.hostId,
    players,
    speakingOrder: obj.speakingOrder,
    currentSpeaker: obj.currentSpeaker,
    eliminated: obj.eliminated,
    winner: obj.winner,
    revealWords: obj.revealWords,
    votes: new Map(obj.votes),
    secretPair: obj.secretPair
  };
}
__name(deserializeRoom, "deserializeRoom");

// src/words.ts
var WORD_BANK = {
  food: {
    zh: [
      { civilian: "\u725B\u5976", undercover: "\u8C46\u6D46" },
      { civilian: "\u5305\u5B50", undercover: "\u997A\u5B50" },
      { civilian: "\u86CB\u7CD5", undercover: "\u9762\u5305" },
      { civilian: "\u706B\u9505", undercover: "\u9EBB\u8FA3\u70EB" },
      { civilian: "\u53EF\u4E50", undercover: "\u96EA\u78A7" },
      { civilian: "\u5496\u5561", undercover: "\u5976\u8336" },
      { civilian: "\u897F\u74DC", undercover: "\u54C8\u5BC6\u74DC" },
      { civilian: "\u85AF\u6761", undercover: "\u85AF\u7247" }
    ],
    en: [
      { civilian: "Milk", undercover: "Soy Milk" },
      { civilian: "Dumpling", undercover: "Bun" },
      { civilian: "Cake", undercover: "Bread" },
      { civilian: "Cola", undercover: "Sprite" },
      { civilian: "Coffee", undercover: "Milk Tea" },
      { civilian: "Fries", undercover: "Chips" },
      { civilian: "Watermelon", undercover: "Cantaloupe" },
      { civilian: "Pizza", undercover: "Pancake" }
    ]
  },
  animals: {
    zh: [
      { civilian: "\u8001\u864E", undercover: "\u72EE\u5B50" },
      { civilian: "\u9752\u86D9", undercover: "\u87FE\u870D" },
      { civilian: "\u5154\u5B50", undercover: "\u4ED3\u9F20" },
      { civilian: "\u9CA8\u9C7C", undercover: "\u6D77\u8C5A" },
      { civilian: "\u4E4C\u9E26", undercover: "\u559C\u9E4A" },
      { civilian: "\u8774\u8776", undercover: "\u871C\u8702" },
      { civilian: "\u9A86\u9A7C", undercover: "\u9A6C" },
      { civilian: "\u4F01\u9E45", undercover: "\u9E2D\u5B50" }
    ],
    en: [
      { civilian: "Tiger", undercover: "Lion" },
      { civilian: "Frog", undercover: "Toad" },
      { civilian: "Rabbit", undercover: "Hamster" },
      { civilian: "Shark", undercover: "Dolphin" },
      { civilian: "Crow", undercover: "Magpie" },
      { civilian: "Butterfly", undercover: "Bee" },
      { civilian: "Camel", undercover: "Horse" },
      { civilian: "Penguin", undercover: "Duck" }
    ]
  },
  daily: {
    zh: [
      { civilian: "\u7259\u5237", undercover: "\u7259\u7B7E" },
      { civilian: "\u96E8\u4F1E", undercover: "\u96E8\u8863" },
      { civilian: "\u94A2\u7B14", undercover: "\u94C5\u7B14" },
      { civilian: "\u6795\u5934", undercover: "\u62B1\u6795" },
      { civilian: "\u773C\u955C", undercover: "\u58A8\u955C" },
      { civilian: "\u6C99\u53D1", undercover: "\u5E8A" },
      { civilian: "\u98CE\u6247", undercover: "\u7A7A\u8C03" },
      { civilian: "\u94A5\u5319", undercover: "\u95E8\u5361" }
    ],
    en: [
      { civilian: "Toothbrush", undercover: "Toothpick" },
      { civilian: "Umbrella", undercover: "Raincoat" },
      { civilian: "Pen", undercover: "Pencil" },
      { civilian: "Pillow", undercover: "Cushion" },
      { civilian: "Glasses", undercover: "Sunglasses" },
      { civilian: "Sofa", undercover: "Bed" },
      { civilian: "Fan", undercover: "Air Conditioner" },
      { civilian: "Key", undercover: "Keycard" }
    ]
  },
  places: {
    zh: [
      { civilian: "\u533B\u9662", undercover: "\u836F\u5E97" },
      { civilian: "\u7535\u5F71\u9662", undercover: "\u5267\u9662" },
      { civilian: "\u6E38\u6CF3\u6C60", undercover: "\u6D77\u8FB9" },
      { civilian: "\u56FE\u4E66\u9986", undercover: "\u4E66\u5E97" },
      { civilian: "\u516C\u4EA4\u8F66", undercover: "\u5730\u94C1" },
      { civilian: "\u673A\u573A", undercover: "\u706B\u8F66\u7AD9" },
      { civilian: "\u516C\u56ED", undercover: "\u5E7F\u573A" },
      { civilian: "\u9910\u5385", undercover: "\u98DF\u5802" }
    ],
    en: [
      { civilian: "Hospital", undercover: "Pharmacy" },
      { civilian: "Cinema", undercover: "Theater" },
      { civilian: "Pool", undercover: "Beach" },
      { civilian: "Library", undercover: "Bookstore" },
      { civilian: "Bus", undercover: "Subway" },
      { civilian: "Airport", undercover: "Train Station" },
      { civilian: "Park", undercover: "Square" },
      { civilian: "Restaurant", undercover: "Canteen" }
    ]
  },
  people: {
    zh: [
      { civilian: "\u533B\u751F", undercover: "\u62A4\u58EB" },
      { civilian: "\u8001\u5E08", undercover: "\u6559\u6388" },
      { civilian: "\u8B66\u5BDF", undercover: "\u4FDD\u5B89" },
      { civilian: "\u6F14\u5458", undercover: "\u6B4C\u624B" },
      { civilian: "\u53A8\u5E08", undercover: "\u670D\u52A1\u5458" },
      { civilian: "\u5F8B\u5E08", undercover: "\u6CD5\u5B98" },
      { civilian: "\u53F8\u673A", undercover: "\u5FEB\u9012\u5458" },
      { civilian: "\u7A0B\u5E8F\u5458", undercover: "\u4EA7\u54C1\u7ECF\u7406" }
    ],
    en: [
      { civilian: "Doctor", undercover: "Nurse" },
      { civilian: "Teacher", undercover: "Professor" },
      { civilian: "Police", undercover: "Security Guard" },
      { civilian: "Actor", undercover: "Singer" },
      { civilian: "Chef", undercover: "Waiter" },
      { civilian: "Lawyer", undercover: "Judge" },
      { civilian: "Driver", undercover: "Courier" },
      { civilian: "Programmer", undercover: "Product Manager" }
    ]
  }
};
function allPairs(lang) {
  return Object.values(WORD_BANK).flatMap((byLang) => byLang[lang] ?? []);
}
__name(allPairs, "allPairs");
function pickPair(category, lang) {
  const pool = category === "random" || !WORD_BANK[category] ? allPairs(lang) : WORD_BANK[category][lang] ?? allPairs(lang);
  const base = pool[Math.floor(Math.random() * pool.length)];
  return Math.random() < 0.5 ? base : { civilian: base.undercover, undercover: base.civilian };
}
__name(pickPair, "pickPair");

// src/game.ts
var GameError = class extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
    this.name = "GameError";
  }
};
__name(GameError, "GameError");
function alivePlayers(room) {
  return [...room.players.values()].filter((p) => p.alive);
}
__name(alivePlayers, "alivePlayers");
function shuffle(input) {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
__name(shuffle, "shuffle");
function clamp(n, lo, hi) {
  if (!Number.isFinite(n))
    return lo;
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
}
__name(clamp, "clamp");
function applyConfig(room, patch) {
  const c = room.config;
  if (patch.undercoverCount !== void 0) {
    c.undercoverCount = clamp(patch.undercoverCount, 0, MAX_PLAYERS);
  }
  if (patch.blankCount !== void 0) {
    c.blankCount = clamp(patch.blankCount, 0, MAX_PLAYERS);
  }
  if (patch.category !== void 0)
    c.category = patch.category;
  if (patch.descriptionTimer !== void 0) {
    c.descriptionTimer = clamp(patch.descriptionTimer, 0, 600);
  }
  if (patch.lang === "zh" || patch.lang === "en")
    c.lang = patch.lang;
}
__name(applyConfig, "applyConfig");
function startGame(room) {
  if (room.phase !== "lobby") {
    throw new GameError("already_started");
  }
  const players = [...room.players.values()];
  const count = players.length;
  const { undercoverCount, blankCount } = room.config;
  const spies = undercoverCount + blankCount;
  const civilians = count - spies;
  if (count < MIN_PLAYERS || undercoverCount < 1 || spies >= count || civilians < 1 || civilians <= spies) {
    throw new GameError("invalid_config");
  }
  const pair = pickPair(room.config.category, room.config.lang);
  const order = shuffle(players);
  const roleFor = /* @__PURE__ */ __name((i) => {
    if (i < undercoverCount)
      return "undercover";
    if (i < undercoverCount + blankCount)
      return "blank";
    return "civilian";
  }, "roleFor");
  const emits = [];
  order.forEach((p, i) => {
    const role = roleFor(i);
    p.role = role;
    p.word = role === "undercover" ? pair.undercover : role === "blank" ? null : pair.civilian;
    p.alive = true;
    p.hasVoted = false;
    p.votesReceived = 0;
    emits.push({ playerId: p.id, secret: { role, word: p.word } });
  });
  room.revealWords = null;
  room.eliminated = null;
  room.winner = null;
  room.votes.clear();
  room.round = 1;
  room.speakingOrder = [];
  room.currentSpeaker = 0;
  room.secretPair = { civilian: pair.civilian, undercover: pair.undercover };
  room.phase = "reveal";
  return emits;
}
__name(startGame, "startGame");
function advancePhase(room) {
  switch (room.phase) {
    case "reveal":
      enterDescribe(room);
      break;
    case "describe": {
      if (room.currentSpeaker < room.speakingOrder.length - 1) {
        room.currentSpeaker += 1;
      } else {
        enterVote(room);
      }
      break;
    }
    case "vote":
      tallyVotes(room);
      break;
    case "voteResult": {
      const elim = room.eliminated;
      if (elim && elim.role === "blank") {
        room.phase = "blankGuess";
      } else {
        resolveAfterElimination(room);
      }
      break;
    }
    case "blankGuess":
      resolveAfterElimination(room);
      break;
    case "lobby":
    case "ended":
      break;
  }
}
__name(advancePhase, "advancePhase");
function enterDescribe(room) {
  room.speakingOrder = shuffle(alivePlayers(room).map((p) => p.id));
  room.currentSpeaker = 0;
  room.eliminated = null;
  for (const p of room.players.values()) {
    p.hasVoted = false;
    p.votesReceived = 0;
  }
  room.votes.clear();
  room.phase = "describe";
}
__name(enterDescribe, "enterDescribe");
function enterVote(room) {
  room.votes.clear();
  for (const p of room.players.values()) {
    p.hasVoted = false;
    p.votesReceived = 0;
  }
  room.phase = "vote";
}
__name(enterVote, "enterVote");
function castVote(room, voterId, targetId) {
  if (room.phase !== "vote")
    throw new GameError("not_your_turn");
  const voter = room.players.get(voterId);
  const target = room.players.get(targetId);
  if (!voter || !voter.alive)
    throw new GameError("not_your_turn");
  if (voter.hasVoted)
    throw new GameError("not_your_turn");
  if (!target || !target.alive)
    throw new GameError("invalid_config");
  if (targetId === voterId)
    throw new GameError("invalid_config");
  room.votes.set(voterId, targetId);
  voter.hasVoted = true;
  const alive = alivePlayers(room);
  const allVoted = alive.every((p) => p.hasVoted);
  return { allVoted };
}
__name(castVote, "castVote");
function tallyVotes(room) {
  for (const p of room.players.values())
    p.votesReceived = 0;
  for (const targetId of room.votes.values()) {
    const t = room.players.get(targetId);
    if (t)
      t.votesReceived += 1;
  }
  const alive = alivePlayers(room);
  let max = 0;
  for (const p of alive)
    max = Math.max(max, p.votesReceived);
  if (max === 0) {
    room.eliminated = null;
    room.phase = "voteResult";
    return;
  }
  const topTied = alive.filter((p) => p.votesReceived === max);
  const victim = topTied[Math.floor(Math.random() * topTied.length)];
  victim.alive = false;
  room.eliminated = {
    playerId: victim.id,
    name: victim.name,
    role: victim.role ?? "civilian",
    word: victim.word
  };
  room.phase = "voteResult";
}
__name(tallyVotes, "tallyVotes");
function blankGuess(room, guesserId, guess) {
  if (room.phase !== "blankGuess")
    throw new GameError("not_your_turn");
  const elim = room.eliminated;
  if (!elim || elim.role !== "blank" || elim.playerId !== guesserId) {
    throw new GameError("not_your_turn");
  }
  const target = (room.secretPair?.civilian ?? "").trim().toLowerCase();
  const got = guess.trim().toLowerCase();
  if (target && got === target) {
    endGame(room, "undercover");
    return;
  }
  resolveAfterElimination(room);
}
__name(blankGuess, "blankGuess");
function resolveAfterElimination(room) {
  const alive = alivePlayers(room);
  const spies = alive.filter(
    (p) => p.role === "undercover" || p.role === "blank"
  ).length;
  const civilians = alive.filter((p) => p.role === "civilian").length;
  if (spies === 0) {
    endGame(room, "civilians");
  } else if (spies >= civilians) {
    endGame(room, "undercover");
  } else {
    startNextRound(room);
  }
}
__name(resolveAfterElimination, "resolveAfterElimination");
function startNextRound(room) {
  room.round += 1;
  room.eliminated = null;
  room.votes.clear();
  for (const p of room.players.values()) {
    p.hasVoted = false;
    p.votesReceived = 0;
  }
  room.speakingOrder = shuffle(alivePlayers(room).map((p) => p.id));
  room.currentSpeaker = 0;
  room.phase = "describe";
}
__name(startNextRound, "startNextRound");
function endGame(room, winner) {
  room.phase = "ended";
  room.winner = winner;
  room.revealWords = room.secretPair ? { civilian: room.secretPair.civilian, undercover: room.secretPair.undercover } : null;
}
__name(endGame, "endGame");
function restartGame(room) {
  room.phase = "lobby";
  room.round = 0;
  room.speakingOrder = [];
  room.currentSpeaker = 0;
  room.eliminated = null;
  room.winner = null;
  room.revealWords = null;
  room.votes.clear();
  room.secretPair = null;
  const emits = [];
  for (const p of room.players.values()) {
    p.role = null;
    p.word = null;
    p.alive = true;
    p.hasVoted = false;
    p.votesReceived = 0;
    emits.push({ playerId: p.id, secret: null });
  }
  return emits;
}
__name(restartGame, "restartGame");
function secretFor(player) {
  if (player.role === null)
    return null;
  return { role: player.role, word: player.word };
}
__name(secretFor, "secretFor");

// src/do.ts
var RoomDO = class extends DurableObject {
  /** In-memory cache of the room; rebuilt from storage on demand. */
  room = null;
  /** Lazily load (and cache) the room from storage. */
  async getRoom() {
    if (this.room)
      return this.room;
    const stored = await this.ctx.storage.get("room");
    if (!stored)
      return null;
    this.room = deserializeRoom(stored);
    return this.room;
  }
  /** Persist the current room snapshot to DO storage. */
  async persist(room) {
    this.room = room;
    await this.ctx.storage.put("room", serializeRoom(room));
  }
  // ------------------------------ HTTP ------------------------------
  async fetch(request) {
    const code = request.headers.get("x-room-code") ?? "";
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (request.method === "POST") {
      if (url.pathname === API_CREATE) {
        return this.handleCreate(request, code);
      }
      return this.handleJoin(request, code);
    }
    return new Response("not found", { status: 404 });
  }
  /**
   * Create the room with the caller as host. If a room already exists in
   * storage, respond 409 so the Worker retries with a fresh code.
   */
  async handleCreate(request, code) {
    const existing = await this.getRoom();
    if (existing) {
      return json({ ok: false, error: "already_started" }, 409);
    }
    const body = await request.json().catch(() => ({}));
    const playerId = (body.playerId ?? "").trim();
    const name = (body.name ?? "").trim();
    if (!playerId || !name) {
      return json({ ok: false, error: "invalid_config" }, 400);
    }
    const config = { ...DEFAULT_CONFIG };
    if (body.lang === "zh" || body.lang === "en")
      config.lang = body.lang;
    const room = createRoom(code, { id: playerId, name }, config);
    await this.persist(room);
    return json({ ok: true, code });
  }
  /**
   * Join an existing room (or resume a held seat). Validation mirrors the
   * original socket.io handler.
   */
  async handleJoin(request, code) {
    const room = await this.getRoom();
    if (!room) {
      return json({ ok: false, error: "room_not_found" }, 404);
    }
    const body = await request.json().catch(() => ({}));
    const playerId = (body.playerId ?? "").trim();
    const name = (body.name ?? "").trim();
    if (!playerId || !name) {
      return json({ ok: false, error: "invalid_config" }, 400);
    }
    const existing = room.players.get(playerId);
    if (existing) {
      existing.name = name || existing.name;
      await this.persist(room);
      return json({ ok: true, code });
    }
    if (room.phase !== "lobby") {
      return json({ ok: false, error: "already_started" }, 409);
    }
    if (room.players.size >= MAX_PLAYERS) {
      return json({ ok: false, error: "room_full" }, 409);
    }
    const taken = [...room.players.values()].some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (taken) {
      return json({ ok: false, error: "name_taken" }, 409);
    }
    room.players.set(playerId, newPlayer(playerId, name, false));
    await this.persist(room);
    return json({ ok: true, code });
  }
  // --------------------------- WebSocket ---------------------------
  async webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : "");
    } catch {
      send(ws, { t: "error", code: "internal_error" });
      return;
    }
    try {
      if (msg.t === "hello") {
        await this.onHello(ws, msg.playerId);
        return;
      }
      const attachment = ws.deserializeAttachment();
      const playerId = attachment?.playerId;
      const room = await this.getRoom();
      if (!playerId || !room || !room.players.get(playerId)) {
        send(ws, { t: "error", code: "room_not_found" });
        return;
      }
      await this.onAction(ws, room, playerId, msg);
    } catch (err) {
      if (err instanceof GameError) {
        send(ws, { t: "error", code: err.code, message: err.message });
      } else {
        send(ws, { t: "error", code: "internal_error" });
      }
    }
  }
  /** Bind a (re)connecting socket to its seat and prime its view. */
  async onHello(ws, playerId) {
    const room = await this.getRoom();
    const seat = room?.players.get(playerId);
    if (!room || !seat) {
      send(ws, { t: "error", code: "room_not_found" });
      ws.close(1e3, "room_not_found");
      return;
    }
    ws.serializeAttachment({ playerId });
    seat.connected = true;
    send(ws, { t: "id", playerId });
    send(ws, { t: "state", state: toRoomState(room) });
    if (room.phase !== "lobby") {
      send(ws, { t: "secret", secret: secretFor(seat) });
    }
    await this.persist(room);
    this.broadcast(room);
  }
  /** Dispatch a non-hello client intent against the authoritative room. */
  async onAction(ws, room, playerId, msg) {
    const isHost = room.hostId === playerId;
    const requireHost = /* @__PURE__ */ __name(() => {
      if (!isHost)
        throw new GameError("not_host");
    }, "requireHost");
    switch (msg.t) {
      case "config": {
        requireHost();
        if (room.phase !== "lobby")
          throw new GameError("already_started");
        applyConfig(room, msg.config ?? {});
        break;
      }
      case "start": {
        requireHost();
        const emits = startGame(room);
        await this.persist(room);
        for (const e of emits)
          this.sendSecret(e.playerId, e.secret);
        this.broadcast(room);
        return;
      }
      case "phaseNext": {
        requireHost();
        advancePhase(room);
        break;
      }
      case "vote": {
        const { allVoted } = castVote(room, playerId, msg.targetId);
        if (allVoted)
          advancePhase(room);
        break;
      }
      case "blankGuess": {
        blankGuess(room, playerId, msg.guess ?? "");
        break;
      }
      case "restart": {
        requireHost();
        const emits = restartGame(room);
        await this.persist(room);
        for (const e of emits)
          this.sendSecret(e.playerId, e.secret);
        this.broadcast(room);
        return;
      }
      case "leave": {
        await this.removeSeat(room, playerId);
        ws.close(1e3, "left");
        return;
      }
    }
    await this.persist(room);
    this.broadcast(room);
  }
  async webSocketClose(ws) {
    await this.onDisconnect(ws);
  }
  async webSocketError(ws) {
    await this.onDisconnect(ws);
  }
  /**
   * A socket dropped. In the lobby we free the seat (and GC the room if empty);
   * mid-game we keep the seat for reconnection and just mark them offline,
   * handing off the host crown if they held it.
   */
  async onDisconnect(ws) {
    const attachment = ws.deserializeAttachment();
    const playerId = attachment?.playerId;
    if (!playerId)
      return;
    const room = await this.getRoom();
    if (!room)
      return;
    const seat = room.players.get(playerId);
    if (!seat)
      return;
    if (room.phase === "lobby") {
      if (await this.removeSeat(room, playerId))
        return;
      return;
    }
    seat.connected = false;
    if (room.hostId === playerId)
      reassignHost(room);
    await this.persist(room);
    this.broadcast(room);
  }
  /**
   * Remove a seat. If the room is now empty, wipe storage entirely. Otherwise
   * reassign host if the leaver held it, persist and broadcast. Returns true
   * if the room was destroyed.
   */
  async removeSeat(room, playerId) {
    const wasHost = room.hostId === playerId;
    room.players.delete(playerId);
    if (room.players.size === 0) {
      this.room = null;
      await this.ctx.storage.deleteAll();
      return true;
    }
    if (wasHost)
      reassignHost(room);
    await this.persist(room);
    this.broadcast(room);
    return false;
  }
  // ---------------------------- transport ----------------------------
  /** Broadcast the public snapshot to every connected socket. */
  broadcast(room) {
    const state = toRoomState(room);
    for (const ws of this.ctx.getWebSockets()) {
      send(ws, { t: "state", state });
    }
  }
  /** Send a private `secret` to whichever socket owns `playerId`. */
  sendSecret(playerId, secret) {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment();
      if (attachment?.playerId === playerId) {
        send(ws, { t: "secret", secret });
        return;
      }
    }
  }
};
__name(RoomDO, "RoomDO");
function send(ws, msg) {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
  }
}
__name(send, "send");
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
__name(json, "json");

// src/index.ts
var ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return out;
}
__name(makeCode, "makeCode");
function forwardWsToRoom(env, code, request) {
  const stub = env.ROOM.get(env.ROOM.idFromName(code));
  const headers = new Headers(request.headers);
  headers.set("x-room-code", code);
  return stub.fetch(new Request(request, { headers }));
}
__name(forwardWsToRoom, "forwardWsToRoom");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === API_CREATE && request.method === "POST") {
      const body = await request.text();
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = makeCode();
        const stub = env.ROOM.get(env.ROOM.idFromName(code));
        const res = await stub.fetch(
          new Request(request.url, {
            method: "POST",
            headers: { "content-type": "application/json", "x-room-code": code },
            body
          })
        );
        if (res.status === 409)
          continue;
        return res;
      }
      return new Response(
        JSON.stringify({ ok: false, error: "internal_error" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    if (url.pathname === API_JOIN && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const code = (body.code ?? "").trim().toUpperCase();
      if (!code) {
        return new Response(
          JSON.stringify({ ok: false, error: "room_not_found" }),
          { status: 404, headers: { "content-type": "application/json" } }
        );
      }
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      return stub.fetch(
        new Request(request.url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-room-code": code },
          body: JSON.stringify(body)
        })
      );
    }
    if (url.pathname === WS_PATH && request.headers.get("Upgrade") === "websocket") {
      const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();
      if (!code)
        return new Response("missing code", { status: 400 });
      return forwardWsToRoom(env, code, request);
    }
    return env.ASSETS.fetch(request);
  }
};

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-LTvnyM/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-LTvnyM/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RoomDO,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
