const assert = require("assert");

const {
  getCampaignConversaSettings,
  getConversaModeQuestions,
  getConversaArchetypeProfiles,
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
  const randomQuestions = getConversaModeQuestions(settings, "random", 3);
  const citasQuestions = getConversaModeQuestions(settings, "citas");

  assert.strictEqual(randomQuestions.length, 9);
  assert.strictEqual(citasQuestions.length, 24);
  assert.strictEqual(citasQuestions.filter((question) => question.level === "Nivel 1").length, 8);
  assert.strictEqual(citasQuestions.filter((question) => question.level === "Nivel 2").length, 8);
  assert.strictEqual(citasQuestions.filter((question) => question.level === "Nivel 3").length, 8);
}

function testConversaArchetypeProfilesKeepExactTies() {
  const game = {
    players: [
      { id: "a", clientId: "a-client", name: "Ana" },
      { id: "b", clientId: "b-client", name: "Beto" }
    ],
    conversa: {
      players: [
        { clientId: "a-client", name: "Ana" },
        { clientId: "b-client", name: "Beto" }
      ],
      questionResults: [
        {
          playerClientId: "a-client",
          classifications: [
            { archetypeId: "payaso" },
            { archetypeId: "artista" }
          ]
        },
        {
          playerClientId: "a-client",
          classifications: [
            { archetypeId: "payaso" },
            { archetypeId: "artista" }
          ]
        },
        {
          playerClientId: "b-client",
          classifications: [
            { archetypeId: "cortante" },
            { archetypeId: "cortante" }
          ]
        }
      ]
    }
  };

  const profiles = getConversaArchetypeProfiles(game);
  const ana = profiles.find((profile) => profile.playerName === "Ana");
  const beto = profiles.find((profile) => profile.playerName === "Beto");

  assert.deepStrictEqual(
    ana.topArchetypes.map((archetype) => archetype.id).sort(),
    ["artista", "payaso"]
  );
  assert.deepStrictEqual(
    beto.topArchetypes.map((archetype) => archetype.id),
    ["cortante"]
  );
}

function run() {
  testCachoBidOrderTreatsOneAsNormalFace();
  testCachoCountDoesNotUseOnesAsWildcards();
  testConversaFallbackQuestionSets();
  testConversaArchetypeProfilesKeepExactTies();
  console.log("Conversa y Cacho: reglas verificadas.");
}

run();
