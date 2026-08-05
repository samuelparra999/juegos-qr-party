const assert = require("assert");

const {
  getCampaignConversaSettings,
  getConversaModeQuestions,
  isHigherCachoBid,
  countCachoFace
} = require("../server").__test;

function testCachoBidOrderTreatsOneAsNormalFace() {
  assert.strictEqual(isHigherCachoBid(null, 1, 1), true);
  assert.strictEqual(isHigherCachoBid({ quantity: 6, face: 1 }, 6, 2), true);
  assert.strictEqual(isHigherCachoBid({ quantity: 6, face: 6 }, 6, 1), false);
  assert.strictEqual(isHigherCachoBid({ quantity: 6, face: 6 }, 7, 1), true);
  assert.strictEqual(isHigherCachoBid({ quantity: 3, face: 4 }, 3, 4), false);
  assert.strictEqual(isHigherCachoBid({ quantity: 3, face: 4 }, 3, 5), true);
}

function testCachoCountDoesNotUseOnesAsWildcards() {
  const dice = [1, 1, 2, 2, 6, 6, 6];

  assert.strictEqual(countCachoFace(dice, 1), 2);
  assert.strictEqual(countCachoFace(dice, 2), 2);
  assert.strictEqual(countCachoFace(dice, 6), 3);
}

function testConversaFallbackQuestionSets() {
  const settings = getCampaignConversaSettings({ campaign: { conversa: {} } });
  const randomQuestions = getConversaModeQuestions(settings, "random");
  const citasQuestions = getConversaModeQuestions(settings, "citas");

  assert.strictEqual(randomQuestions.length, 12);
  assert.strictEqual(citasQuestions.length, 19);
  assert.strictEqual(citasQuestions.filter((question) => question.level === "Nivel 1").length, 8);
  assert.strictEqual(citasQuestions.filter((question) => question.level === "Nivel 2").length, 8);
  assert.strictEqual(citasQuestions.filter((question) => question.level === "Nivel 3").length, 3);
}

function run() {
  testCachoBidOrderTreatsOneAsNormalFace();
  testCachoCountDoesNotUseOnesAsWildcards();
  testConversaFallbackQuestionSets();
  console.log("Conversa y Cacho: reglas verificadas.");
}

run();
