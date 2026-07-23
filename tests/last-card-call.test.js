const assert = require("node:assert/strict");
const {
  games,
  createInactiveLastCardCall,
  getPublicLastCardState,
  playLastCard,
  drawLastCardForTurn,
  handleLastCardCall,
  reassignPlayerSocket,
  clearLastCardTimer,
  clearLastCardCallTimer
} = require("../server").__test;

let gameSequence = 0;

function card(id, color = "red", value = "1", type = "number") {
  return { id, color, value, type };
}

function createGame(hands, options = {}) {
  const pin = `TEST-${++gameSequence}`;
  const names = ["A", "B", "C", "D"];
  const appPlayers = hands.map((_, index) => ({
    id: `socket-${names[index].toLowerCase()}`,
    clientId: `client-${names[index].toLowerCase()}`,
    name: names[index],
    score: 0,
    connected: true
  }));
  const game = {
    pin,
    leaderId: appPlayers[0].id,
    status: "last_card",
    selectedGames: ["lastcard"],
    players: appPlayers,
    campaignSlug: "demo",
    campaign: {},
    lastCard: {
      players: hands.map((hand, index) => ({
        clientId: appPlayers[index].clientId,
        name: appPlayers[index].name,
        hand: [...hand]
      })),
      drawPile: Array.from({ length: 20 }, (_, index) => {
        return card(`draw-${pin}-${index}`, "blue", String(index % 10));
      }),
      discardPile: [card(`top-${pin}`, "red", "5")],
      currentColor: "red",
      currentPlayerIndex: options.currentPlayerIndex || 0,
      direction: options.direction || 1,
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
    }
  };

  games.set(pin, game);
  return game;
}

function appPlayer(game, index) {
  return game.players[index];
}

function forceOpponentsEnabled(game) {
  game.lastCard.lastCardCall.opponentsEnabledAt = Date.now() - 1;
}

function cleanup(game) {
  clearLastCardTimer(game);
  clearLastCardCallTimer(game);
  games.delete(game.pin);
}

function openWindowWithFourPlayers(firstCard = card("a-play", "red", "1")) {
  const game = createGame([
    [firstCard, card("a-last", "blue", "7")],
    [card("b-1", "red", "2"), card("b-2", "green", "8"), card("b-3", "yellow", "4")],
    [card("c-1", "green", "3"), card("c-2", "yellow", "6")],
    [card("d-1", "blue", "9"), card("d-2", "yellow", "1")]
  ]);

  const result = playLastCard(game.pin, appPlayer(game, 0), firstCard.id, null);
  assert.equal(result.ok, true);
  return game;
}

function run() {
  let game;

  // Caso 1: solo el objetivo puede declarar durante los primeros dos segundos.
  game = openWindowWithFourPlayers();
  assert.equal(game.lastCard.lastCardCall.active, true);
  assert.equal(game.lastCard.lastCardCall.targetPlayerId, "client-a");
  assert.equal(game.lastCard.lastCardCall.nextPlayerId, "client-b");
  assert.equal(getPublicLastCardState(game, "socket-a").lastCardCall.canPress, true);
  assert.equal(getPublicLastCardState(game, "socket-b").lastCardCall.canPress, false);
  cleanup(game);

  // Caso 2: el objetivo declara dentro de los primeros dos segundos.
  game = openWindowWithFourPlayers();
  game.lastCard.lastCardCall.openedAt = Date.now() - 1000;
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 0)).result, "declared");
  assert.equal(game.lastCard.players[0].hand.length, 1);
  assert.equal(game.lastCard.lastCardCall.active, false);
  cleanup(game);

  // Caso 3: el primer oponente válido señala y aplica exactamente dos cartas.
  game = openWindowWithFourPlayers();
  forceOpponentsEnabled(game);
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 2)).result, "caught");
  assert.equal(game.lastCard.players[0].hand.length, 3);
  assert.equal(game.lastCard.lastCardCall.resolvedByPlayerId, "client-c");
  cleanup(game);

  // Caso 4: el primer clic procesado gana y el segundo no cambia el resultado.
  game = openWindowWithFourPlayers();
  forceOpponentsEnabled(game);
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 0)).result, "declared");
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 1)).ok, false);
  assert.equal(game.lastCard.players[0].hand.length, 1);
  cleanup(game);

  game = openWindowWithFourPlayers();
  forceOpponentsEnabled(game);
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 1)).result, "caught");
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 0)).ok, false);
  assert.equal(game.lastCard.players[0].hand.length, 3);
  cleanup(game);

  // Caso 5: el robo válido del siguiente jugador expira la ventana sin penalización.
  game = openWindowWithFourPlayers();
  assert.equal(drawLastCardForTurn(game.pin, appPlayer(game, 1)).ok, true);
  assert.equal(game.lastCard.lastCardCall.result, "expired");
  assert.equal(game.lastCard.players[0].hand.length, 1);
  cleanup(game);

  // Caso 6: una carta válida del siguiente jugador también expira la ventana.
  game = openWindowWithFourPlayers();
  assert.equal(playLastCard(game.pin, appPlayer(game, 1), "b-1", null).ok, true);
  assert.equal(game.lastCard.lastCardCall.result, "expired");
  assert.equal(game.lastCard.players[0].hand.length, 1);
  cleanup(game);

  // Caso 7: un oponente que se adelanta es rechazado y la ventana continúa.
  game = openWindowWithFourPlayers();
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 2)).ok, false);
  assert.equal(game.lastCard.lastCardCall.active, true);
  assert.equal(game.lastCard.lastCardCall.resolved, false);
  cleanup(game);

  // Caso 8: pasar de tres cartas a dos no abre la ventana.
  game = createGame([
    [card("a-3-play", "red", "1"), card("a-3-2", "blue", "2"), card("a-3-3", "green", "3")],
    [card("b-8-1"), card("b-8-2")]
  ]);
  assert.equal(playLastCard(game.pin, appPlayer(game, 0), "a-3-play", null).ok, true);
  assert.equal(game.lastCard.lastCardCall.active, false);
  cleanup(game);

  // Caso 9: pasar de una carta a cero termina el juego sin abrir otra ventana.
  game = createGame([
    [card("a-wins", "red", "1")],
    [card("b-9-1"), card("b-9-2")]
  ]);
  assert.equal(playLastCard(game.pin, appPlayer(game, 0), "a-wins", null).ok, true);
  assert.equal(game.status, "last_card_result");
  assert.equal(game.lastCard.lastCardCall.active, false);
  cleanup(game);

  // Caso 10: un clic duplicado no vuelve a penalizar.
  game = openWindowWithFourPlayers();
  forceOpponentsEnabled(game);
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 1)).ok, true);
  assert.equal(handleLastCardCall(game.pin, appPlayer(game, 1)).ok, false);
  assert.equal(game.lastCard.players[0].hand.length, 3);
  cleanup(game);

  // Caso 11: una jugada inválida no cierra la ventana.
  game = openWindowWithFourPlayers();
  assert.equal(playLastCard(game.pin, appPlayer(game, 1), "b-2", null).ok, false);
  assert.equal(game.lastCard.lastCardCall.active, true);
  assert.equal(game.lastCard.lastCardCall.result, null);
  cleanup(game);

  // Caso 12: una reconexión reconstruye objetivo, permisos y plazo.
  game = openWindowWithFourPlayers();
  reassignPlayerSocket(game, appPlayer(game, 0), "socket-a-reconnected");
  const reconnectedState = getPublicLastCardState(game, "socket-a-reconnected");
  assert.equal(reconnectedState.lastCardCall.targetPlayerId, "socket-a-reconnected");
  assert.equal(reconnectedState.lastCardCall.canPress, true);
  assert.ok(reconnectedState.lastCardCall.opponentsEnabledAt > reconnectedState.lastCardCall.openedAt);
  cleanup(game);

  // Los efectos deben calcular correctamente quién recibe el siguiente turno.
  game = openWindowWithFourPlayers(card("a-reverse", "red", "reverse", "reverse"));
  assert.equal(game.lastCard.lastCardCall.nextPlayerId, "client-d");
  cleanup(game);

  game = openWindowWithFourPlayers(card("a-skip", "red", "skip", "skip"));
  assert.equal(game.lastCard.lastCardCall.nextPlayerId, "client-c");
  cleanup(game);

  game = openWindowWithFourPlayers(card("a-draw2", "red", "draw2", "draw2"));
  assert.equal(game.lastCard.players[1].hand.length, 5);
  assert.equal(game.lastCard.lastCardCall.nextPlayerId, "client-c");
  cleanup(game);

  console.log("Última Carta: 12 casos obligatorios y efectos de turno OK");
}

try {
  run();
} finally {
  for (const game of games.values()) {
    cleanup(game);
  }
}
