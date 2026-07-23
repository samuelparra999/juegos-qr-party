const assert = require("node:assert/strict");
const { io: createClient } = require("../node_modules/socket.io/client-dist/socket.io.js");
const {
  server,
  io,
  games,
  createInactiveLastCardCall,
  clearLastCardTimer,
  clearLastCardCallTimer
} = require("../server").__test;

function card(id, color = "red", value = "1", type = "number") {
  return { id, color, value, type };
}

function waitFor(socket, event, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Tiempo agotado esperando ${event}`));
    }, timeoutMs);

    function handler(data) {
      if (!predicate(data)) return;
      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(data);
    }

    socket.on(event, handler);
  });
}

function emitWithAck(socket, event, data) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Tiempo agotado esperando respuesta de ${event}`));
    }, 5000);

    socket.emit(event, data, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

function setLastCardScenario(game) {
  clearLastCardTimer(game);
  clearLastCardCallTimer(game);
  game.status = "last_card";
  game.lastCard = {
    players: game.players.map((player, index) => ({
      clientId: player.clientId,
      name: player.name,
      hand: index === 0
        ? [card("target-play"), card("target-last", "blue", "7")]
        : [
          card(`player-${index}-1`, "red", "2"),
          card(`player-${index}-2`, "green", "8"),
          card(`player-${index}-3`, "yellow", "4")
        ]
    })),
    drawPile: Array.from({ length: 20 }, (_, index) => {
      return card(`socket-draw-${index}`, "blue", String(index % 10));
    }),
    discardPile: [card("socket-top", "red", "5")],
    currentColor: "red",
    currentPlayerIndex: 0,
    direction: 1,
    drawnCardId: null,
    message: "",
    callMessage: "",
    endAt: null,
    actionTimer: null,
    callEnableTimer: null,
    actionTimeoutMs: 60000,
    winnerBasePoints: 100,
    awaitingContinue: false,
    lastResult: null,
    lastCardCall: createInactiveLastCardCall()
  };
}

async function connect(baseUrl) {
  const socket = createClient(baseUrl, { transports: ["websocket"] });
  await waitFor(socket, "connect");
  return socket;
}

async function run() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const sockets = [];

  try {
    const targetSocket = await connect(baseUrl);
    const opponentOne = await connect(baseUrl);
    const opponentTwo = await connect(baseUrl);
    sockets.push(targetSocket, opponentOne, opponentTwo);

    const created = await emitWithAck(targetSocket, "create_game", {
      name: "A",
      campaignSlug: "demo",
      clientId: "socket-client-a"
    });
    assert.equal(created.ok, true);
    const pin = created.game.pin;

    assert.equal((await emitWithAck(opponentOne, "join_game", {
      pin,
      name: "B",
      clientId: "socket-client-b"
    })).ok, true);
    assert.equal((await emitWithAck(opponentTwo, "join_game", {
      pin,
      name: "C",
      clientId: "socket-client-c"
    })).ok, true);

    const game = games.get(pin);
    setLastCardScenario(game);

    const targetOpened = waitFor(
      targetSocket,
      "last_card_state",
      (data) => data.lastCardState.lastCardCall.active
    );
    const opponentOpened = waitFor(
      opponentOne,
      "last_card_state",
      (data) => data.lastCardState.lastCardCall.active
    );

    const played = await emitWithAck(targetSocket, "play_last_card", {
      pin,
      cardId: "target-play",
      chosenColor: null
    });
    assert.equal(played.ok, true);

    const [targetState, opponentState] = await Promise.all([targetOpened, opponentOpened]);
    assert.equal(targetState.lastCardState.lastCardCall.canPress, true);
    assert.equal(opponentState.lastCardState.lastCardCall.canPress, false);

    const earlyClick = await emitWithAck(opponentOne, "call_last_card", { pin });
    assert.equal(earlyClick.ok, false);
    assert.equal(game.lastCard.lastCardCall.active, true);

    await waitFor(
      opponentOne,
      "last_card_state",
      (data) => data.lastCardState.lastCardCall.canPress,
      4000
    );

    const simultaneousResults = await Promise.all([
      emitWithAck(opponentOne, "call_last_card", { pin }),
      emitWithAck(opponentTwo, "call_last_card", { pin })
    ]);
    assert.equal(simultaneousResults.filter((result) => result.ok).length, 1);
    assert.equal(simultaneousResults.filter((result) => !result.ok).length, 1);
    assert.equal(game.lastCard.players[0].hand.length, 3);
    assert.equal(game.lastCard.lastCardCall.result, "caught");

    setLastCardScenario(game);
    const reopened = waitFor(
      targetSocket,
      "last_card_state",
      (data) => data.lastCardState.lastCardCall.active
    );
    assert.equal((await emitWithAck(targetSocket, "play_last_card", {
      pin,
      cardId: "target-play",
      chosenColor: null
    })).ok, true);
    await reopened;

    targetSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const reconnectedTarget = await connect(baseUrl);
    sockets.push(reconnectedTarget);
    const restoredState = waitFor(
      reconnectedTarget,
      "last_card_state",
      (data) => data.lastCardState.lastCardCall.active
    );
    const rejoined = await emitWithAck(reconnectedTarget, "join_game", {
      pin,
      name: "A",
      clientId: "socket-client-a"
    });
    assert.equal(rejoined.ok, true);

    const restored = await restoredState;
    assert.equal(restored.lastCardState.lastCardCall.targetPlayerId, reconnectedTarget.id);
    assert.equal(restored.lastCardState.lastCardCall.canPress, true);

    console.log("Última Carta Socket.IO: plazo real, carrera y reconexión OK");
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    for (const game of games.values()) {
      clearLastCardTimer(game);
      clearLastCardCallTimer(game);
    }
    games.clear();
    await new Promise((resolve) => io.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
