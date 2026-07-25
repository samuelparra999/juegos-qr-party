const assert = require("node:assert/strict");
const {
  createLastCardDeck,
  drawLastCards,
  takeInitialLastCard
} = require("../server").__test;

const COLORS = ["red", "yellow", "green", "blue"];

function countCards(deck, predicate) {
  return deck.filter(predicate).length;
}

function assertStandardDistribution(deck, includeReverse) {
  const expectedLength = includeReverse ? 108 : 100;
  assert.equal(deck.length, expectedLength);

  COLORS.forEach((color) => {
    const numberedCards = deck.filter((card) => {
      return card.color === color && card.type === "number";
    });

    assert.equal(numberedCards.length, 19);
    assert.equal(countCards(numberedCards, (card) => card.value === "0"), 1);

    for (let value = 1; value <= 9; value++) {
      assert.equal(
        countCards(numberedCards, (card) => card.value === String(value)),
        2
      );
    }

    assert.equal(
      countCards(deck, (card) => card.color === color && card.type === "draw2"),
      2
    );
    assert.equal(
      countCards(deck, (card) => card.color === color && card.type === "skip"),
      2
    );
    assert.equal(
      countCards(deck, (card) => card.color === color && card.type === "reverse"),
      includeReverse ? 2 : 0
    );
  });

  assert.equal(countCards(deck, (card) => card.type === "wild"), 4);
  assert.equal(countCards(deck, (card) => card.type === "wild4"), 4);
}

const standardDeck = createLastCardDeck(4, 0);
assertStandardDistribution(standardDeck, true);

const twoPlayerDeck = createLastCardDeck(2, 0);
assertStandardDistribution(twoPlayerDeck, false);
assert.equal(twoPlayerDeck.some((card) => card.type === "reverse"), false);

const nextGeneration = createLastCardDeck(4, 1);
const firstGenerationIds = new Set(standardDeck.map((card) => card.id));
assert.equal(nextGeneration.some((card) => firstGenerationIds.has(card.id)), false);

const infiniteGame = {
  lastCard: {
    players: [
      { clientId: "a", name: "A", hand: [] },
      { clientId: "b", name: "B", hand: [] }
    ],
    drawPile: [],
    discardPile: [
      { id: "top", color: "red", type: "number", value: "5" }
    ],
    deckGeneration: 0
  }
};
const drawnCards = drawLastCards(infiniteGame, infiniteGame.lastCard.players[0], 250);
assert.equal(drawnCards.length, 250);
assert.equal(drawnCards.some((card) => card.type === "reverse"), false);
assert.equal(new Set(drawnCards.map((card) => card.id)).size, 250);
assert.equal(infiniteGame.lastCard.discardPile.length, 1);

const initialCardGame = {
  lastCard: {
    players: [
      { clientId: "a", name: "A", hand: [] },
      { clientId: "b", name: "B", hand: [] },
      { clientId: "c", name: "C", hand: [] }
    ],
    drawPile: [
      { id: "skip-only", color: "red", type: "skip", value: "skip" },
      { id: "wild-only", color: "wild", type: "wild", value: "wild" },
      { id: "draw-only", color: "blue", type: "draw2", value: "draw2" }
    ],
    discardPile: [],
    deckGeneration: 4
  }
};
const initialCard = takeInitialLastCard(initialCardGame);
assert.equal(initialCard.type, "number");
assert.ok(COLORS.includes(initialCard.color));

console.log("Última Carta: distribución, pila infinita e inicio numérico OK");
