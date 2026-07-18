const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const QRCode = require("qrcode");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const games = new Map();

const GAME_ORDER = ["knowledge", "friend", "heads", "word", "poker"];

const GAME_LABELS = {
  knowledge: "Trivia de conocimiento",
  friend: "Votazo",
  heads: "Heads Up",
  word: "Word Connect",
  poker: "Poker"
};

const DEFAULT_SELECTED_GAMES = ["knowledge", "heads", "word"];
const MIN_CONNECTED_PLAYERS = 2;
const LACK_PLAYERS_GRACE_MS = Math.max(
  0,
  Number(process.env.LACK_PLAYERS_GRACE_MS) || 30000
);

const DEFAULT_POKER_SETTINGS = {
  initialChips: 5000,
  smallBlind: 50,
  bigBlind: 100,
  totalRounds: 3,
  minInitialChips: 100,
  maxInitialChips: 1000000,
  minRounds: 1,
  maxRounds: 10,
  minSmallBlind: 10,
  maxSmallBlind: 1000,
  minBigBlind: 10,
  maxBigBlind: 2000,
  actionTimeoutMs: 30000
};

const THEMES = [
  { id: "deportes", name: "Deportes" },
  { id: "historia", name: "Historia" },
  { id: "cine", name: "Cine" },
  { id: "ciencia", name: "Ciencia" }
];

const triviaQuestions = {
  deportes: [
    {
      question: "¿Cuántos jugadores tiene un equipo de fútbol en la cancha?",
      options: ["9", "10", "11", "12"],
      correctIndex: 2
    },
    {
      question: "¿En qué deporte se usa una raqueta?",
      options: ["Tenis", "Boxeo", "Natación", "Ciclismo"],
      correctIndex: 0
    },
    {
      question: "¿Cada cuántos años se celebran normalmente los Juegos Olímpicos?",
      options: ["2 años", "3 años", "4 años", "5 años"],
      correctIndex: 2
    }
  ],
  historia: [
    {
      question: "¿En qué año llegó Cristóbal Colón a América?",
      options: ["1492", "1520", "1810", "1914"],
      correctIndex: 0
    },
    {
      question: "¿Cuál civilización construyó las pirámides de Giza?",
      options: ["Romana", "Egipcia", "Griega", "Maya"],
      correctIndex: 1
    },
    {
      question: "¿Cuál guerra terminó en 1945?",
      options: [
        "Primera Guerra Mundial",
        "Guerra Fría",
        "Segunda Guerra Mundial",
        "Guerra de Vietnam"
      ],
      correctIndex: 2
    }
  ],
  cine: [
    {
      question: "¿Qué objeto usa Harry Potter para volar en el quidditch?",
      options: ["Una alfombra", "Una escoba", "Un dragón", "Un cohete"],
      correctIndex: 1
    },
    {
      question: "¿Cuál película tiene un barco llamado Titanic?",
      options: ["Avatar", "Titanic", "Gladiador", "Jumanji"],
      correctIndex: 1
    },
    {
      question: "¿Qué estudio creó Toy Story?",
      options: ["Pixar", "Marvel", "DreamWorks", "Universal"],
      correctIndex: 0
    }
  ],
  ciencia: [
    {
      question: "¿Cuál es el planeta más cercano al Sol?",
      options: ["Venus", "Marte", "Mercurio", "Júpiter"],
      correctIndex: 2
    },
    {
      question: "¿Qué gas respiramos principalmente para vivir?",
      options: ["Oxígeno", "Helio", "Dióxido de carbono", "Hidrógeno"],
      correctIndex: 0
    },
    {
      question: "¿Cuál órgano bombea la sangre?",
      options: ["Pulmón", "Cerebro", "Hígado", "Corazón"],
      correctIndex: 3
    }
  ]
};

const votazoQuestions = [
  {
    question: "¿Qué llevarías a una isla desierta?",
    options: ["Bote", "Celular", "Linterna", "Machete"]
  },
  {
    question: "Si el grupo encuentra una puerta misteriosa, ¿qué harían primero?",
    options: ["Abrirla", "Buscar pistas", "Grabar un video", "Salir corriendo"]
  },
  {
    question: "¿Qué elegirías para sobrevivir una noche sin electricidad?",
    options: ["Comida enlatada", "Linterna", "Radio", "Velas"]
  },
  {
    question: "Si solo pudieran elegir una recompensa para el grupo, ¿cuál sería?",
    options: ["Cena gratis", "Dinero", "Día libre", "Viaje sorpresa"]
  },
  {
    question: "¿Qué harías si el grupo se pierde en una ciudad desconocida?",
    options: ["Buscar Wi-Fi", "Llamar a alguien", "Pedir ayuda", "Seguir caminando"]
  }
];

const headsUpWords = [
  { category: "Animales", word: "Tigre" },
  { category: "Animales", word: "Pingüino" },
  { category: "Animales", word: "Cocodrilo" },
  { category: "Objetos", word: "Celular" },
  { category: "Objetos", word: "Sombrilla" },
  { category: "Objetos", word: "Guitarra" },
  { category: "Personajes", word: "Spider-Man" },
  { category: "Personajes", word: "Harry Potter" },
  { category: "Personajes", word: "Shrek" },
  { category: "Lugares", word: "Playa" },
  { category: "Lugares", word: "Hospital" },
  { category: "Lugares", word: "Aeropuerto" },
  { category: "Acciones", word: "Bailar" },
  { category: "Acciones", word: "Dormir" },
  { category: "Acciones", word: "Cocinar" }
];

const wordConnectPuzzles = [
  {
    letters: ["M", "A", "P", "A", "S", "T"],
    validWords: ["MAS", "MAPA", "PASA", "TAPA", "TAPAS", "PASTA", "ASPAS", "MATA", "PATA"]
  },
  {
    letters: ["C", "A", "S", "A", "R", "T"],
    validWords: ["CASA", "CARTA", "RATA", "SACA", "TASA", "CARA", "ARTA", "RASTA"]
  },
  {
    letters: ["L", "U", "N", "A", "R", "E"],
    validWords: ["LUNA", "LUNAR", "RUNA", "REAL", "LERA", "ARLE", "UNA", "ERA"]
  }
];

const DEFAULT_CAMPAIGN_SLUG = "demo";
const campaignsCache = new Map();

function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "");
}

function getCampaignPath(slug) {
  return path.join(__dirname, "data", "campaigns", `${slug}.json`);
}

function loadCampaign(slug = DEFAULT_CAMPAIGN_SLUG) {
  const cleanCampaignSlug = cleanSlug(slug) || DEFAULT_CAMPAIGN_SLUG;

  if (campaignsCache.has(cleanCampaignSlug)) {
    return campaignsCache.get(cleanCampaignSlug);
  }

  const campaignPath = getCampaignPath(cleanCampaignSlug);

  if (!fs.existsSync(campaignPath)) {
    if (cleanCampaignSlug !== DEFAULT_CAMPAIGN_SLUG) {
      return loadCampaign(DEFAULT_CAMPAIGN_SLUG);
    }

    throw new Error(`No existe la campaña: ${cleanCampaignSlug}`);
  }

  const rawCampaign = fs.readFileSync(campaignPath, "utf8");
  const campaign = JSON.parse(rawCampaign);

  campaignsCache.set(cleanCampaignSlug, campaign);

  return campaign;
}

function getPublicCampaign(campaign) {
  return {
    slug: campaign.slug,
    name: campaign.name,
    brandName: campaign.brandName,
    welcomeText: campaign.welcomeText,
    visual: campaign.visual,
    games: campaign.games,
    knowledgeTrivia: {
      themes: campaign.knowledgeTrivia?.themes || []
    }
  };
}

function getCampaignThemes(game) {
  return game.campaign?.knowledgeTrivia?.themes || THEMES;
}

function getCampaignKnowledgeQuestions(game, themeId) {
  const campaignQuestions = game.campaign?.knowledgeTrivia?.questions;

  if (Array.isArray(campaignQuestions)) {
    return campaignQuestions.filter((question) => question.theme === themeId);
  }

  const fallbackQuestions = triviaQuestions[themeId] || [];

  return fallbackQuestions.map((question) => ({
    ...question,
    theme: themeId
  }));
}

function getCampaignFriendQuestions(game) {
  const questions = game.campaign?.votazo?.questions || game.campaign?.friendTrivia?.questions;

  if (Array.isArray(questions) && questions.length) {
    return questions
      .map(normalizeVotazoQuestion)
      .filter(Boolean);
  }

  return votazoQuestions;
}

function getCampaignVotazoDuration(game) {
  const durationMs = Number(game.campaign?.votazo?.durationMs);

  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 90000;
}

function normalizeVotazoQuestion(rawQuestion) {
  if (!rawQuestion) return null;

  if (typeof rawQuestion === "string") {
    return {
      question: rawQuestion,
      options: ["Aventura", "Comodidad", "Plan seguro", "Sorpresa"]
    };
  }

  const question = String(rawQuestion.question || rawQuestion.text || "").trim();
  const options = Array.isArray(rawQuestion.options)
    ? rawQuestion.options
        .map((option) => String(option || "").trim())
        .filter(Boolean)
    : [];

  if (!question || options.length < 2) return null;

  return {
    question,
    options
  };
}

function getCampaignHeadsUpWords(game) {
  const words = game.campaign?.headsUp?.words;

  if (Array.isArray(words) && words.length) {
    return words;
  }

  return headsUpWords;
}

function getCampaignHeadsUpDuration(game) {
  return game.campaign?.headsUp?.durationMs || 90000;
}

function getCampaignWordConnectPuzzles(game) {
  const puzzles = game.campaign?.wordConnect?.puzzles;

  if (Array.isArray(puzzles) && puzzles.length) {
    return puzzles;
  }

  return wordConnectPuzzles;
}

function getCampaignWordConnectDuration(game) {
  return game.campaign?.wordConnect?.durationMs || 60000;
}

function getCampaignPokerSettings(game) {
  const campaignPoker = game.campaign?.poker || {};

  return {
    ...DEFAULT_POKER_SETTINGS,
    ...campaignPoker
  };
}

function sanitizePokerSettings(rawSettings, game) {
  const defaults = getCampaignPokerSettings(game);

  const initialChips = Number(rawSettings?.initialChips ?? defaults.initialChips);
  const smallBlind = Number(rawSettings?.smallBlind ?? defaults.smallBlind);
  const bigBlind = Number(rawSettings?.bigBlind ?? defaults.bigBlind);
  const totalRounds = Number(rawSettings?.totalRounds ?? defaults.totalRounds);

  const safeNumber = (value, fallback) => Number.isFinite(value) ? value : fallback;

  const safeSmallBlind = Math.max(
    defaults.minSmallBlind,
    Math.min(defaults.maxSmallBlind, safeNumber(smallBlind, defaults.smallBlind))
  );

  const safeBigBlind = Math.max(
    safeSmallBlind,
    defaults.minBigBlind,
    Math.min(defaults.maxBigBlind, safeNumber(bigBlind, defaults.bigBlind))
  );

  const safeInitialChips = Math.max(
    safeBigBlind,
    defaults.minInitialChips,
    Math.min(
      defaults.maxInitialChips,
      safeNumber(initialChips, defaults.initialChips)
    )
  );

  const safeTotalRounds = Math.max(
    defaults.minRounds,
    Math.min(defaults.maxRounds, safeNumber(totalRounds, defaults.totalRounds))
  );

  return {
    initialChips: safeInitialChips,
    smallBlind: safeSmallBlind,
    bigBlind: safeBigBlind,
    totalRounds: safeTotalRounds,
    minInitialChips: defaults.minInitialChips,
    maxInitialChips: defaults.maxInitialChips,
    minRounds: defaults.minRounds,
    maxRounds: defaults.maxRounds,
    minSmallBlind: defaults.minSmallBlind,
    maxSmallBlind: defaults.maxSmallBlind,
    minBigBlind: defaults.minBigBlind,
    maxBigBlind: defaults.maxBigBlind,
    actionTimeoutMs: defaults.actionTimeoutMs
  };
}

function getThemeNameFromCampaign(game, themeId) {
  const themes = getCampaignThemes(game);
  const theme = themes.find((item) => item.id === themeId);

  return theme ? theme.name : themeId;
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.redirect("/juegos");
});

app.get("/juegos", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/jugar/:campaignSlug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/juegos/:campaignSlug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/campaign/:campaignSlug", (req, res) => {
  try {
    const campaignSlug = cleanSlug(req.params.campaignSlug);
    const campaign = loadCampaign(campaignSlug);

    res.json({
      ok: true,
      campaign: getPublicCampaign(campaign)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "No se pudo cargar la campaña."
    });
  }
});

app.get("/qr", async (req, res) => {
  const gameUrl = `${req.protocol}://${req.get("host")}/juegos`;

  try {
    const qrDataUrl = await QRCode.toDataURL(gameUrl, {
      margin: 1,
      width: 240
    });

    res.json({
      url: gameUrl,
      qr: qrDataUrl
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo generar el QR"
    });
  }
});

app.get("/qr/:pin", async (req, res) => {
  try {
    const pin = cleanPin(req.params.pin);

    if (!pin || pin.length !== 6) {
      return res.status(400).json({
        ok: false,
        message: "PIN inválido."
      });
    }

    const game = games.get(pin);

    if (!game) {
      return res.status(404).json({
        ok: false,
        message: "No se encontró la partida."
      });
    }

    const campaignSlug = game.campaignSlug || DEFAULT_CAMPAIGN_SLUG;

    const baseUrl =
      process.env.PUBLIC_URL ||
      `${req.protocol}://${req.get("host")}`;

    const url = `${baseUrl}/juegos/${campaignSlug}?pin=${pin}`;
    const qr = await QRCode.toDataURL(url);

    res.json({
      ok: true,
      url,
      qr
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "No se pudo generar el QR de la partida."
    });
  }
});

function generatePin() {
  let pin;

  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (games.has(pin));

  return pin;
}

function cleanName(name) {
  return String(name || "")
    .trim()
    .slice(0, 20)
    .replace(/[<>]/g, "");
}

function cleanPin(pin) {
  return String(pin || "")
    .replace(/\D/g, "")
    .trim();
}

function cleanClientId(clientId) {
  return String(clientId || "")
    .trim()
    .slice(0, 80)
    .replace(/[^\w.-]/g, "");
}

function getThemeName(themeId) {
  const theme = THEMES.find((item) => item.id === themeId);
  return theme ? theme.name : themeId;
}

function getThemeVoteCounts(game) {
  const counts = {};
  const themes = getCampaignThemes(game);

  themes.forEach((theme) => {
    counts[theme.id] = 0;
  });

  game.players.forEach((player) => {
    const vote = game.themeVotes[player.id];

    if (vote && counts[vote] !== undefined) {
      counts[vote]++;
    }
  });

  return counts;
}

function chooseWinningTheme(game) {
  const themes = getCampaignThemes(game);
  const counts = getThemeVoteCounts(game);

  let winner = themes[0]?.id;
  let highestVotes = -1;

  themes.forEach((theme) => {
    if (counts[theme.id] > highestVotes) {
      winner = theme.id;
      highestVotes = counts[theme.id];
    }
  });

  return winner;
}

function sanitizeSelectedGames(selectedGames, playerCount, campaign = null) {
  const receivedGames = Array.isArray(selectedGames)
    ? selectedGames
    : DEFAULT_SELECTED_GAMES;

  const available = campaign?.games?.available || {
    knowledge: true,
    friend: true,
    heads: true,
    word: true,
    poker: true
  };

  const allowedGames = receivedGames.filter((gameId) => {
    if (!GAME_ORDER.includes(gameId)) return false;
    if (!available[gameId]) return false;

    return true;
  });

  return GAME_ORDER.filter((gameId) => allowedGames.includes(gameId));
}

function getCurrentSelectedGameId(game) {
  if (!game || !Array.isArray(game.selectedGames)) return null;
  return game.selectedGames[game.currentGameIndex] || null;
}

function hasNextSelectedGame(game) {
  if (!game || !Array.isArray(game.selectedGames)) return false;

  for (let index = game.currentGameIndex + 1; index < game.selectedGames.length; index++) {
    const gameId = game.selectedGames[index];

    if (GAME_ORDER.includes(gameId)) {
      return true;
    }
  }

  return false;
}

function showBetweenGamesScoreboard(pin, finishedGameId = null) {
  const game = games.get(pin);

  if (!game) return;

  const resolvedGameId = finishedGameId || getCurrentSelectedGameId(game);
  const nextGameAvailable = hasNextSelectedGame(game);

  game.status = "between_games";
  game.betweenGames = {
    finishedGameId: resolvedGameId,
    hasNextGame: nextGameAvailable
  };

  io.to(pin).emit("between_games_scoreboard", {
    game: publicGame(game),
    finishedGameId: resolvedGameId,
    finishedGameName: GAME_LABELS[resolvedGameId] || "Juego",
    hasNextGame: nextGameAvailable,
    ranking: getRanking(game)
  });
}

function startNextSelectedGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.betweenGames = null;
  game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

  if (!game.selectedGames.length) {
    finishFinalGame(pin);
    return;
  }

  if (typeof game.currentGameIndex !== "number") {
    game.currentGameIndex = -1;
  }

  game.currentGameIndex++;

  while (game.currentGameIndex < game.selectedGames.length) {
    const nextGame = game.selectedGames[game.currentGameIndex];

    if (nextGame === "knowledge") {
      startKnowledgeThemeVote(pin);
      return;
    }

    if (nextGame === "friend") {
      startFriendTriviaIntro(pin);
      return;
    }

    if (nextGame === "heads") {
      startHeadsUpIntro(pin);
      return;
    }

    if (nextGame === "word") {
      startWordConnectIntro(pin);
      return;
    }

    if (nextGame === "poker") {
      startPokerIntro(pin);
      return;
    }

    game.currentGameIndex++;
  }

  finishFinalGame(pin);
}

function startKnowledgeThemeVote(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "theme_vote";
  game.themeVotes = {};

  const themes = getCampaignThemes(game);

  io.to(pin).emit("theme_vote_started", {
    game: publicGame(game),
    themes,
    votes: getThemeVoteCounts(game)
  });
}

function publicGame(game) {
  return {
    pin: game.pin,
    leaderId: game.leaderId,
    status: game.status,
    selectedTheme: game.selectedTheme,
    selectedGames: game.selectedGames || DEFAULT_SELECTED_GAMES,
    currentGameIndex: game.currentGameIndex,
    campaignSlug: game.campaignSlug,
    campaign: getPublicCampaign(game.campaign),
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      isLeader: player.id === game.leaderId
    }))
  };
}

function getRanking(game) {
  return [...game.players]
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      position: index + 1,
      name: player.name,
      score: player.score
    }));
}

function publicQuestion(game) {
  const theme = game.selectedTheme;
  const questions = game.trivia.questions || [];
  const index = game.trivia.currentQuestionIndex;
  const question = questions[index];

  return {
    index,
    number: index + 1,
    total: questions.length,
    theme,
    themeName: getThemeNameFromCampaign(game, theme),
    question: question.question,
    options: question.options.map((text, optionIndex) => ({
      index: optionIndex,
      text
    })),
    durationMs: game.trivia.durationMs,
    endAt: game.trivia.endAt
  };
}

function clearTriviaTimers(game) {
  if (!game || !game.trivia) return;

  if (game.trivia.questionTimer) {
    clearTimeout(game.trivia.questionTimer);
  }

  if (game.trivia.betweenTimer) {
    clearTimeout(game.trivia.betweenTimer);
  }
}

function startTrivia(pin) {
  const game = games.get(pin);

  if (!game) return;
  if (game.status !== "theme_vote") return;

  const winningTheme = chooseWinningTheme(game);
  const questions = shuffleArray(
    getCampaignKnowledgeQuestions(game, winningTheme)
  ).slice(0, 6);

  if (!questions.length) {
    game.status = "knowledge_finished";

    io.to(pin).emit("knowledge_trivia_finished", {
      game: publicGame(game),
      ranking: getRanking(game)
    });

    showBetweenGamesScoreboard(pin, "knowledge");

    return;
  }

  game.status = "trivia";
  game.selectedTheme = winningTheme;
  game.trivia = {
    questions,
    currentQuestionIndex: -1,
    answers: {},
    questionOpen: false,
    questionStartTime: null,
    durationMs: 15000,
    endAt: null,
    questionTimer: null,
    betweenTimer: null
  };

  io.to(pin).emit("theme_chosen", {
    theme: winningTheme,
    themeName: getThemeNameFromCampaign(game, winningTheme),
    game: publicGame(game)
  });

  game.trivia.betweenTimer = setTimeout(() => {
    nextQuestion(pin);
  }, 1200);
}

function nextQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "trivia") return;

  const questions = game.trivia.questions || [];

  game.trivia.currentQuestionIndex++;

  if (game.trivia.currentQuestionIndex >= questions.length) {
    endTrivia(pin);
    return;
  }

  game.trivia.answers = {};
  game.trivia.questionOpen = true;
  game.trivia.questionStartTime = Date.now();
  game.trivia.endAt = Date.now() + game.trivia.durationMs;

  io.to(pin).emit("trivia_question", {
    game: publicGame(game),
    question: publicQuestion(game)
  });

  game.trivia.questionTimer = setTimeout(() => {
    finishQuestion(pin);
  }, game.trivia.durationMs + 250);
}

function finishQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "trivia" || !game.trivia) return;
  if (!game.trivia.questionOpen) return;

  game.trivia.questionOpen = false;

  if (game.trivia.questionTimer) {
    clearTimeout(game.trivia.questionTimer);
    game.trivia.questionTimer = null;
  }

  const questions = game.trivia.questions || [];
  const question = questions[game.trivia.currentQuestionIndex];

  const answers = game.players.map((player) => {
    const answer = game.trivia.answers[player.id];

    return {
      playerId: player.id,
      playerName: player.name,
      selectedText: answer ? question.options[answer.optionIndex] : "Sin respuesta",
      correct: answer ? answer.correct : false,
      points: answer ? answer.points : 0,
      totalScore: player.score
    };
  });

  io.to(pin).emit("trivia_question_result", {
    game: publicGame(game),
    questionNumber: game.trivia.currentQuestionIndex + 1,
    correctIndex: question.correctIndex,
    correctText: question.options[question.correctIndex],
    answers,
    ranking: getRanking(game)
  });

  game.trivia.betweenTimer = setTimeout(() => {
    nextQuestion(pin);
  }, 4500);
}

function endTrivia(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearTriviaTimers(game);

  game.status = "knowledge_finished";

  io.to(pin).emit("knowledge_trivia_finished", {
    game: publicGame(game),
    ranking: getRanking(game)
  });

  showBetweenGamesScoreboard(pin, "knowledge");
}

function publicFriendQuestion(game) {
  const questions = game.friend.questions || [];
  const index = game.friend.currentQuestionIndex;
  const question = questions[index];
  const options = getVotazoOptions(question);

  return {
    index,
    number: index + 1,
    total: questions.length,
    question: question.question,
    options,
    durationMs: game.friend.durationMs,
    endAt: game.friend.endAt
  };
}

function getVotazoOptions(question) {
  const optionTexts = Array.isArray(question?.options) ? question.options : [];

  return [...optionTexts]
    .map((text, originalIndex) => ({
      id: String(originalIndex),
      text
    }))
    .sort((a, b) => a.text.localeCompare(b.text, "es", { sensitivity: "base" }))
    .map((option, index) => ({
      ...option,
      letter: String.fromCharCode(65 + index)
    }));
}

function clearFriendTimers(game) {
  if (!game || !game.friend) return;

  if (game.friend.questionTimer) {
    clearTimeout(game.friend.questionTimer);
  }

  if (game.friend.betweenTimer) {
    clearTimeout(game.friend.betweenTimer);
  }
}

function startFriendTriviaIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "friend_intro";

  io.to(pin).emit("friend_trivia_intro", {
    game: publicGame(game)
  });
}

function startFriendTrivia(pin) {
  const game = games.get(pin);

  if (!game) return;

  const questions = shuffleArray(getCampaignFriendQuestions(game));

  if (!questions.length) {
    showBetweenGamesScoreboard(pin, "friend");

    return;
  }

  game.status = "friend_trivia";
  game.friend = {
    questions,
    currentQuestionIndex: -1,
    votes: {},
    questionOpen: false,
    awaitingContinue: false,
    lastResult: null,
    durationMs: getCampaignVotazoDuration(game),
    endAt: null,
    questionTimer: null,
    betweenTimer: null
  };

  io.to(pin).emit("friend_trivia_started", {
    game: publicGame(game)
  });

  game.friend.betweenTimer = setTimeout(() => {
    nextFriendQuestion(pin);
  }, 1500);
}

function nextFriendQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "friend_trivia") return;

  const questions = game.friend.questions || [];

  game.friend.currentQuestionIndex++;

  if (game.friend.currentQuestionIndex >= questions.length) {
    showBetweenGamesScoreboard(pin, "friend");

    return;
  }

  game.friend.votes = {};
  game.friend.questionOpen = true;
  game.friend.awaitingContinue = false;
  game.friend.lastResult = null;
  game.friend.endAt = Date.now() + game.friend.durationMs;

  io.to(pin).emit("friend_question", {
    game: publicGame(game),
    question: publicFriendQuestion(game)
  });

  game.friend.questionTimer = setTimeout(() => {
    finishFriendQuestion(pin);
  }, game.friend.durationMs + 250);
}

function finishFriendQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "friend_trivia" || !game.friend) return;
  if (!game.friend.questionOpen) return;

  game.friend.questionOpen = false;
  game.friend.awaitingContinue = true;

  if (game.friend.questionTimer) {
    clearTimeout(game.friend.questionTimer);
    game.friend.questionTimer = null;
  }

  const currentQuestion = game.friend.questions[game.friend.currentQuestionIndex];
  const options = getVotazoOptions(currentQuestion);
  const voteCounts = {};

  options.forEach((option) => {
    voteCounts[option.id] = 0;
  });

  Object.values(game.friend.votes).forEach((optionId) => {
    if (voteCounts[optionId] !== undefined) {
      voteCounts[optionId]++;
    }
  });

  const totalVotes = Object.values(voteCounts).reduce((total, votes) => total + votes, 0);
  const majorityOptionId = Object.keys(voteCounts).find((optionId) => {
    return voteCounts[optionId] > totalVotes / 2;
  });
  const winningOptionIds = majorityOptionId === undefined ? [] : [majorityOptionId];

  const resultOptions = options.map((option) => ({
    ...option,
    votes: voteCounts[option.id] || 0,
    isWinner: winningOptionIds.includes(option.id)
  }));

  const answers = game.players.map((player) => {
    const selectedOptionId = game.friend.votes[player.id];
    const selectedOption = options.find((option) => option.id === selectedOptionId);
    const votedWinner = winningOptionIds.includes(selectedOptionId);
    const points = votedWinner ? 100 : 0;

    player.score += points;

    return {
      playerId: player.id,
      playerName: player.name,
      selectedOptionId,
      selectedText: selectedOption ? selectedOption.text : "Sin voto",
      selectedLetter: selectedOption ? selectedOption.letter : "-",
      votedWinner,
      points,
      totalScore: player.score
    };
  });

  const result = {
    question: currentQuestion.question,
    options: resultOptions,
    winningOptionIds,
    answers,
    ranking: getRanking(game)
  };

  game.friend.lastResult = result;

  io.to(pin).emit("friend_question_result", {
    game: publicGame(game),
    ...result
  });
}

function endFullGame(pin) {
  startHeadsUpIntro(pin);
}

function clearHeadsUpTimers(game) {
  if (!game || !game.heads) return;

  if (game.heads.turnTimer) {
    clearTimeout(game.heads.turnTimer);
  }

  if (game.heads.betweenTimer) {
    clearTimeout(game.heads.betweenTimer);
  }
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];

    copy[i] = copy[randomIndex];
    copy[randomIndex] = temp;
  }

  return copy;
}

const POKER_SUITS = [
  { id: "S", symbol: "♠", color: "black" },
  { id: "H", symbol: "♥", color: "red" },
  { id: "D", symbol: "♦", color: "red" },
  { id: "C", symbol: "♣", color: "black" }
];

const POKER_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const POKER_RANK_VALUES = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

const POKER_HAND_RANKINGS = [
  {
    position: 1,
    name: "Carta alta",
    description: "Cuando no hay combinación, gana la carta más alta.",
    cards: [
      { rank: "K", suit: "H", symbol: "♥", color: "red" },
      { rank: "J", suit: "S", symbol: "♠", color: "black" },
      { rank: "10", suit: "C", symbol: "♣", color: "black" },
      { rank: "6", suit: "H", symbol: "♥", color: "red" },
      { rank: "3", suit: "D", symbol: "♦", color: "red" }
    ]
  },
  {
    position: 2,
    name: "Pareja",
    description: "Dos cartas del mismo valor.",
    cards: [
      { rank: "A", suit: "H", symbol: "♥", color: "red" },
      { rank: "A", suit: "C", symbol: "♣", color: "black" },
      { rank: "2", suit: "D", symbol: "♦", color: "red" },
      { rank: "6", suit: "H", symbol: "♥", color: "red" },
      { rank: "8", suit: "S", symbol: "♠", color: "black" }
    ]
  },
  {
    position: 3,
    name: "Doble pareja",
    description: "Dos parejas distintas.",
    cards: [
      { rank: "6", suit: "S", symbol: "♠", color: "black" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" },
      { rank: "10", suit: "C", symbol: "♣", color: "black" },
      { rank: "10", suit: "D", symbol: "♦", color: "red" },
      { rank: "K", suit: "D", symbol: "♦", color: "red" }
    ]
  },
  {
    position: 4,
    name: "Trío",
    description: "Tres cartas del mismo valor.",
    cards: [
      { rank: "J", suit: "D", symbol: "♦", color: "red" },
      { rank: "J", suit: "C", symbol: "♣", color: "black" },
      { rank: "J", suit: "H", symbol: "♥", color: "red" },
      { rank: "5", suit: "C", symbol: "♣", color: "black" },
      { rank: "8", suit: "D", symbol: "♦", color: "red" }
    ]
  },
  {
    position: 5,
    name: "Escalera",
    description: "Cinco cartas consecutivas de palos distintos.",
    cards: [
      { rank: "2", suit: "D", symbol: "♦", color: "red" },
      { rank: "3", suit: "C", symbol: "♣", color: "black" },
      { rank: "4", suit: "S", symbol: "♠", color: "black" },
      { rank: "5", suit: "D", symbol: "♦", color: "red" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 6,
    name: "Color",
    description: "Cinco cartas del mismo palo, no consecutivas.",
    cards: [
      { rank: "Q", suit: "C", symbol: "♣", color: "black" },
      { rank: "8", suit: "C", symbol: "♣", color: "black" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" },
      { rank: "4", suit: "C", symbol: "♣", color: "black" },
      { rank: "3", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 7,
    name: "Full house",
    description: "Un trío y una pareja.",
    cards: [
      { rank: "K", suit: "C", symbol: "♣", color: "black" },
      { rank: "K", suit: "H", symbol: "♥", color: "red" },
      { rank: "K", suit: "S", symbol: "♠", color: "black" },
      { rank: "10", suit: "C", symbol: "♣", color: "black" },
      { rank: "10", suit: "S", symbol: "♠", color: "black" }
    ]
  },
  {
    position: 8,
    name: "Póker",
    description: "Cuatro cartas del mismo valor.",
    cards: [
      { rank: "A", suit: "D", symbol: "♦", color: "red" },
      { rank: "A", suit: "C", symbol: "♣", color: "black" },
      { rank: "A", suit: "H", symbol: "♥", color: "red" },
      { rank: "A", suit: "S", symbol: "♠", color: "black" },
      { rank: "8", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 9,
    name: "Escalera de color",
    description: "Cinco cartas consecutivas del mismo palo.",
    cards: [
      { rank: "5", suit: "C", symbol: "♣", color: "black" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" },
      { rank: "7", suit: "C", symbol: "♣", color: "black" },
      { rank: "8", suit: "C", symbol: "♣", color: "black" },
      { rank: "9", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 10,
    name: "Escalera real",
    description: "10, J, Q, K y A del mismo palo.",
    cards: [
      { rank: "10", suit: "S", symbol: "♠", color: "black" },
      { rank: "J", suit: "S", symbol: "♠", color: "black" },
      { rank: "Q", suit: "S", symbol: "♠", color: "black" },
      { rank: "K", suit: "S", symbol: "♠", color: "black" },
      { rank: "A", suit: "S", symbol: "♠", color: "black" }
    ]
  }
];

function createPokerDeck() {
  const deck = [];

  POKER_SUITS.forEach((suit) => {
    POKER_RANKS.forEach((rank) => {
      deck.push({
        rank,
        suit: suit.id,
        symbol: suit.symbol,
        color: suit.color
      });
    });
  });

  return shuffleArray(deck);
}

function drawPokerCard(game) {
  if (!game.poker || !Array.isArray(game.poker.deck)) return null;
  return game.poker.deck.pop() || null;
}

function getPokerStageLabel(stage) {
  const labels = {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
    hand_finished: "Mano terminada"
  };

  return labels[stage] || stage;
}

function getNextPokerRevealLabel(stage) {
  return "Las fases avanzan automáticamente";
}

function getPokerPlayer(game, playerId) {
  return game.poker.players.find((player) => player.id === playerId);
}

function getPokerSeatIndexes(playerCount, dealerIndex) {
  if (playerCount === 2) {
    return {
      dealerIndex,
      smallBlindIndex: dealerIndex,
      bigBlindIndex: (dealerIndex + 1) % playerCount
    };
  }

  return {
    dealerIndex,
    smallBlindIndex: (dealerIndex + 1) % playerCount,
    bigBlindIndex: (dealerIndex + 2) % playerCount
  };
}

function postPokerBlind(game, playerIndex, amount) {
  const player = game.poker.players[playerIndex];

  if (!player) return;

  const posted = Math.min(player.chips, amount);

  player.chips -= posted;
  player.committed += posted;
  player.streetBet += posted;

  if (player.chips <= 0) {
    player.allIn = true;
  }

  game.poker.pot += posted;
}

function getPokerRankValue(card) {
  return POKER_RANK_VALUES[card.rank] || 0;
}

function formatPokerRankValue(value) {
  const labels = {
    14: "A",
    13: "K",
    12: "Q",
    11: "J"
  };

  return labels[value] || String(value);
}

function getCombinations(items, size) {
  const results = [];

  function backtrack(startIndex, current) {
    if (current.length === size) {
      results.push([...current]);
      return;
    }

    for (let i = startIndex; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);

  return results;
}

function getStraightHighFromRanks(rankValues) {
  const uniqueRanks = [...new Set(rankValues)].sort((a, b) => a - b);

  if (uniqueRanks.includes(14)) {
    uniqueRanks.unshift(1);
  }

  let runLength = 1;
  let bestHigh = 0;

  for (let i = 1; i < uniqueRanks.length; i++) {
    if (uniqueRanks[i] === uniqueRanks[i - 1] + 1) {
      runLength++;

      if (runLength >= 5) {
        bestHigh = uniqueRanks[i];
      }
    } else if (uniqueRanks[i] !== uniqueRanks[i - 1]) {
      runLength = 1;
    }
  }

  return bestHigh;
}

function getPokerHandName(category, values) {
  if (category === 8 && values[0] === 14) return "Escalera real";
  if (category === 8) return "Escalera de color";
  if (category === 7) return "Póker";
  if (category === 6) return "Full house";
  if (category === 5) return "Color";
  if (category === 4) return "Escalera";
  if (category === 3) return "Trío";
  if (category === 2) return "Doble pareja";
  if (category === 1) return "Pareja";
  return "Carta alta";
}

function evaluateFivePokerCards(cards) {
  const rankValues = cards
    .map(getPokerRankValue)
    .sort((a, b) => b - a);

  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHighFromRanks(rankValues);

  const countByRank = {};

  rankValues.forEach((rank) => {
    countByRank[rank] = (countByRank[rank] || 0) + 1;
  });

  const groups = Object.entries(countByRank)
    .map(([rank, count]) => ({
      rank: Number(rank),
      count
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  if (isFlush && straightHigh) {
    const category = 8;

    return {
      category,
      values: [straightHigh],
      cards,
      name: getPokerHandName(category, [straightHigh])
    };
  }

  const four = groups.find((group) => group.count === 4);

  if (four) {
    const kicker = groups.find((group) => group.rank !== four.rank).rank;
    const category = 7;

    return {
      category,
      values: [four.rank, kicker],
      cards,
      name: getPokerHandName(category, [four.rank, kicker])
    };
  }

  const trips = groups.filter((group) => group.count === 3);
  const pairs = groups.filter((group) => group.count === 2);

  if (trips.length && (pairs.length || trips.length > 1)) {
    const tripRank = trips[0].rank;
    const pairRank = pairs.length ? pairs[0].rank : trips[1].rank;
    const category = 6;

    return {
      category,
      values: [tripRank, pairRank],
      cards,
      name: getPokerHandName(category, [tripRank, pairRank])
    };
  }

  if (isFlush) {
    const category = 5;

    return {
      category,
      values: rankValues,
      cards,
      name: getPokerHandName(category, rankValues)
    };
  }

  if (straightHigh) {
    const category = 4;

    return {
      category,
      values: [straightHigh],
      cards,
      name: getPokerHandName(category, [straightHigh])
    };
  }

  if (trips.length) {
    const tripRank = trips[0].rank;
    const kickers = groups
      .filter((group) => group.rank !== tripRank)
      .map((group) => group.rank)
      .sort((a, b) => b - a)
      .slice(0, 2);

    const category = 3;

    return {
      category,
      values: [tripRank, ...kickers],
      cards,
      name: getPokerHandName(category, [tripRank, ...kickers])
    };
  }

  if (pairs.length >= 2) {
    const highPair = pairs[0].rank;
    const lowPair = pairs[1].rank;
    const kicker = groups.find(
      (group) => group.rank !== highPair && group.rank !== lowPair
    ).rank;

    const category = 2;

    return {
      category,
      values: [highPair, lowPair, kicker],
      cards,
      name: getPokerHandName(category, [highPair, lowPair, kicker])
    };
  }

  if (pairs.length === 1) {
    const pairRank = pairs[0].rank;
    const kickers = groups
      .filter((group) => group.rank !== pairRank)
      .map((group) => group.rank)
      .sort((a, b) => b - a)
      .slice(0, 3);

    const category = 1;

    return {
      category,
      values: [pairRank, ...kickers],
      cards,
      name: getPokerHandName(category, [pairRank, ...kickers])
    };
  }

  return {
    category: 0,
    values: rankValues,
    cards,
    name: getPokerHandName(0, rankValues)
  };
}

function comparePokerHands(handA, handB) {
  if (handA.category !== handB.category) {
    return handA.category - handB.category;
  }

  const maxLength = Math.max(handA.values.length, handB.values.length);

  for (let i = 0; i < maxLength; i++) {
    const valueA = handA.values[i] || 0;
    const valueB = handB.values[i] || 0;

    if (valueA !== valueB) {
      return valueA - valueB;
    }
  }

  return 0;
}

function evaluateSevenPokerCards(cards) {
  const validCards = cards.filter(Boolean);

  if (validCards.length < 5) {
    return null;
  }

  const combinations = getCombinations(validCards, 5);
  let bestHand = null;

  combinations.forEach((combination) => {
    const evaluatedHand = evaluateFivePokerCards(combination);

    if (!bestHand || comparePokerHands(evaluatedHand, bestHand) > 0) {
      bestHand = evaluatedHand;
    }
  });

  if (!bestHand) return null;

  return {
    ...bestHand,
    description: `${bestHand.name} con ${bestHand.values
      .map(formatPokerRankValue)
      .join(", ")}`
  };
}

function canPokerPlayerAct(player) {
  return Boolean(
    player &&
    !player.isOut &&
    !player.folded &&
    !player.allIn &&
    player.chips > 0
  );
}

function getPokerPlayersStillInHand(game) {
  return game.poker.players.filter((player) => !player.isOut && !player.folded);
}

function getPokerActivePlayerIndexes(game) {
  return game.poker.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isOut && player.chips > 0)
    .map(({ index }) => index);
}

function getNextPokerActiveIndex(game, fromIndex) {
  const players = game.poker.players;

  for (let step = 1; step <= players.length; step++) {
    const index = (fromIndex + step + players.length) % players.length;
    const player = players[index];

    if (player && !player.isOut && player.chips > 0) {
      return index;
    }
  }

  return -1;
}

function getPokerSeatIndexesForHand(game) {
  const activeIndexes = getPokerActivePlayerIndexes(game);

  if (activeIndexes.length < 2) {
    return {
      dealerIndex: -1,
      smallBlindIndex: -1,
      bigBlindIndex: -1
    };
  }

  if (!activeIndexes.includes(game.poker.dealerIndex)) {
    game.poker.dealerIndex = activeIndexes[0];
  }

  const dealerPosition = activeIndexes.indexOf(game.poker.dealerIndex);
  const dealerIndex = activeIndexes[dealerPosition];

  if (activeIndexes.length === 2) {
    return {
      dealerIndex,
      smallBlindIndex: dealerIndex,
      bigBlindIndex: activeIndexes[(dealerPosition + 1) % activeIndexes.length]
    };
  }

  return {
    dealerIndex,
    smallBlindIndex: activeIndexes[(dealerPosition + 1) % activeIndexes.length],
    bigBlindIndex: activeIndexes[(dealerPosition + 2) % activeIndexes.length]
  };
}

function clearPokerActionTimer(game) {
  if (!game || !game.poker) return;

  if (game.poker.actionTimer) {
    clearTimeout(game.poker.actionTimer);
    game.poker.actionTimer = null;
  }

  game.poker.actionEndsAt = null;
}

function startPokerActionTimer(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  clearPokerActionTimer(game);

  const currentPlayer = getCurrentPokerPlayer(game);

  if (!currentPlayer || !canPokerPlayerAct(currentPlayer)) return;

  if (!["preflop", "flop", "turn", "river"].includes(game.poker.stage)) return;

  const timeoutMs = game.poker.settings.actionTimeoutMs || 30000;

  game.poker.actionEndsAt = Date.now() + timeoutMs;

  game.poker.actionTimer = setTimeout(() => {
    const latestGame = games.get(pin);

    if (!latestGame || latestGame.status !== "poker" || !latestGame.poker) return;

    const latestCurrentPlayer = getCurrentPokerPlayer(latestGame);

    if (!latestCurrentPlayer || latestCurrentPlayer.id !== currentPlayer.id) return;

    const actions = getPokerAvailableActions(latestGame, latestCurrentPlayer.id);

    if (actions.check) {
      handlePokerAction(pin, latestCurrentPlayer.id, "check");
      return;
    }

    handlePokerAction(pin, latestCurrentPlayer.id, "fold");
  }, timeoutMs);
}

function getPokerPlayersWhoCanAct(game) {
  return game.poker.players.filter(canPokerPlayerAct);
}

function getCurrentPokerPlayer(game) {
  if (typeof game.poker.currentPlayerIndex !== "number") return null;
  return game.poker.players[game.poker.currentPlayerIndex] || null;
}

function getNextPokerPlayerIndex(game, fromIndex) {
  const players = game.poker.players;

  if (!players.length) return -1;

  for (let step = 1; step <= players.length; step++) {
    const index = (fromIndex + step + players.length) % players.length;
    const player = players[index];

    if (canPokerPlayerAct(player)) {
      return index;
    }
  }

  return -1;
}

function getFirstPokerPlayerToActIndex(game) {
  const players = game.poker.players;

  if (!players.length) return -1;

  let startIndex;

  if (game.poker.stage === "preflop") {
    startIndex = game.poker.bigBlindIndex;
  } else {
    startIndex = game.poker.dealerIndex;
  }

  return getNextPokerPlayerIndex(game, startIndex);
}

function getPokerCallAmount(game, player) {
  if (!player) return 0;

  return Math.max(0, game.poker.currentBet - player.streetBet);
}

function getPokerAvailableActions(game, viewerId) {
  const player = getPokerPlayer(game, viewerId);
  const currentPlayer = getCurrentPokerPlayer(game);

  const emptyActions = {
    check: false,
    call: false,
    bet: false,
    raise: false,
    fold: false,
    callAmount: 0,
    minBet: game.poker?.settings?.bigBlind || 100,
    minRaiseTo: 0,
    maxBet: 0
  };

  if (!player || !currentPlayer || player.id !== currentPlayer.id) {
    return emptyActions;
  }

  if (!["preflop", "flop", "turn", "river"].includes(game.poker.stage)) {
    return emptyActions;
  }

  if (!canPokerPlayerAct(player)) {
    return emptyActions;
  }

  const callAmount = getPokerCallAmount(game, player);
  const maxBet = player.streetBet + player.chips;
  const minBet = game.poker.settings.bigBlind;
  const minRaiseTo = game.poker.currentBet + game.poker.minimumRaise;

  return {
    check: callAmount === 0,
    call: callAmount > 0,
    bet: game.poker.currentBet === 0,
    raise: game.poker.currentBet > 0 && player.chips > callAmount,
    fold: true,
    callAmount,
    minBet,
    minRaiseTo,
    maxBet
  };
}

function applyPokerBet(game, player, amount) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const paid = Math.min(player.chips, safeAmount);

  player.chips -= paid;
  player.streetBet += paid;
  player.committed += paid;
  game.poker.pot += paid;

  if (player.chips <= 0) {
    player.allIn = true;
  }

  return paid;
}

function markOtherPokerPlayersAsPending(game, aggressorId) {
  game.poker.players.forEach((player) => {
    if (player.id === aggressorId) return;
    if (player.folded || player.allIn) return;

    player.hasActed = false;
  });
}

function resetPokerStreetBets(game) {
  game.poker.players.forEach((player) => {
    player.streetBet = 0;
    player.hasActed = false;
  });

  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
}

function isPokerBettingRoundComplete(game) {
  const playersWhoCanAct = getPokerPlayersWhoCanAct(game);

  if (!playersWhoCanAct.length) {
    return true;
  }

  return playersWhoCanAct.every((player) => {
    return player.hasActed && player.streetBet === game.poker.currentBet;
  });
}

function finishPokerHandByFold(pin) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);

  const remainingPlayers = getPokerPlayersStillInHand(game);
  const winner = remainingPlayers[0];

  if (winner) {
    winner.chips += game.poker.pot;
  }

  game.poker.message = winner
    ? `${winner.name} gana la mano porque los demás se retiraron.`
    : "La mano terminó.";

  game.poker.pot = 0;
  game.poker.stage = "hand_finished";
  game.poker.currentPlayerIndex = null;
  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
  game.poker.actionEndsAt = null;

  emitPokerState(pin, game);
}

function buildPokerPots(game) {
  const committedPlayers = game.poker.players.filter((player) => player.committed > 0);
  const commitmentLevels = [...new Set(committedPlayers.map((player) => player.committed))]
    .sort((a, b) => a - b);

  const pots = [];
  let previousLevel = 0;

  commitmentLevels.forEach((level) => {
    const contributors = committedPlayers.filter((player) => player.committed >= level);
    const amount = (level - previousLevel) * contributors.length;
    const eligiblePlayerIds = contributors
      .filter((player) => !player.folded)
      .map((player) => player.id);

    if (amount > 0 && eligiblePlayerIds.length) {
      pots.push({
        amount,
        eligiblePlayerIds
      });
    }

    previousLevel = level;
  });

  return pots;
}

function finishPokerShowdown(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  game.poker.stage = "showdown";
  game.poker.showdown = true;
  game.poker.currentPlayerIndex = null;

  clearPokerActionTimer(game);

  const activePlayers = game.poker.players.filter((player) => {
    return !player.folded && player.hand && player.hand.length === 2;
  });

  activePlayers.forEach((player) => {
    player.bestHand = evaluateSevenPokerCards([
      ...player.hand,
      ...game.poker.communityCards
    ]);
  });

  const pots = buildPokerPots(game);
  const payouts = {};
  const potResults = [];

  game.poker.players.forEach((player) => {
    payouts[player.id] = 0;
  });

  pots.forEach((pot, potIndex) => {
    const eligiblePlayers = pot.eligiblePlayerIds
      .map((playerId) => getPokerPlayer(game, playerId))
      .filter((player) => player && !player.folded && player.bestHand);

    if (!eligiblePlayers.length) return;

    let bestHand = eligiblePlayers[0].bestHand;

    eligiblePlayers.forEach((player) => {
      if (comparePokerHands(player.bestHand, bestHand) > 0) {
        bestHand = player.bestHand;
      }
    });

    const winners = eligiblePlayers.filter((player) => {
      return comparePokerHands(player.bestHand, bestHand) === 0;
    });

    const sortedWinners = [...winners].sort((a, b) => a.seat - b.seat);
    const baseShare = Math.floor(pot.amount / sortedWinners.length);
    let remainder = pot.amount % sortedWinners.length;

    sortedWinners.forEach((winner) => {
      const extraChip = remainder > 0 ? 1 : 0;

      winner.chips += baseShare + extraChip;
      payouts[winner.id] += baseShare + extraChip;

      if (remainder > 0) {
        remainder--;
      }
    });

    potResults.push({
      potNumber: potIndex + 1,
      amount: pot.amount,
      winnerNames: sortedWinners.map((winner) => winner.name),
      handName: bestHand.name,
      description: bestHand.description,
      share: baseShare
    });
  });

  const winnersText = potResults
    .map((result) => {
      return `Bote ${result.potNumber}: ${result.winnerNames.join(", ")} gana con ${result.description}`;
    })
    .join(" | ");


  game.poker.pot = 0;
  game.poker.stage = "hand_finished";
  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
  game.poker.showdownResults = potResults;
  game.poker.payouts = payouts;
  game.poker.message = winnersText || "Showdown terminado.";

  emitPokerState(pin, game);
}

function startPokerBettingRound(pin, message) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);
  resetPokerStreetBets(game);

  game.poker.currentPlayerIndex = getFirstPokerPlayerToActIndex(game);
  game.poker.message = message;

  if (game.poker.currentPlayerIndex === -1) {
    advancePokerAfterBettingRound(pin);
    return;
  }

  startPokerActionTimer(pin);
  emitPokerState(pin, game);
}

function advancePokerAfterBettingRound(pin) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);

  if (getPokerPlayersStillInHand(game).length <= 1) {
    finishPokerHandByFold(pin);
    return;
  }

  if (game.poker.stage === "preflop") {
    game.poker.communityCards.push(
      drawPokerCard(game),
      drawPokerCard(game),
      drawPokerCard(game)
    );

    game.poker.stage = "flop";
    startPokerBettingRound(pin, "Flop revelado. Nueva ronda de apuestas.");
    return;
  }

  if (game.poker.stage === "flop") {
    game.poker.communityCards.push(drawPokerCard(game));

    game.poker.stage = "turn";
    startPokerBettingRound(pin, "Turn revelado. Nueva ronda de apuestas.");
    return;
  }

  if (game.poker.stage === "turn") {
    game.poker.communityCards.push(drawPokerCard(game));

    game.poker.stage = "river";
    startPokerBettingRound(pin, "River revelado. Última ronda de apuestas.");
    return;
  }

  if (game.poker.stage === "river") {
    finishPokerShowdown(pin);
  }
}

function movePokerTurnOrAdvance(pin) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);

  if (getPokerPlayersStillInHand(game).length <= 1) {
    finishPokerHandByFold(pin);
    return;
  }

  if (isPokerBettingRoundComplete(game)) {
    advancePokerAfterBettingRound(pin);
    return;
  }

  game.poker.currentPlayerIndex = getNextPokerPlayerIndex(
    game,
    game.poker.currentPlayerIndex
  );

  const currentPlayer = getCurrentPokerPlayer(game);

  if (currentPlayer) {
    startPokerActionTimer(pin);
  }

  emitPokerState(pin, game);
}

function handlePokerAction(pin, socketId, action, rawAmount) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) {
    return {
      ok: false,
      message: "Poker no está activo."
    };
  }

  if (!["preflop", "flop", "turn", "river"].includes(game.poker.stage)) {
    return {
      ok: false,
      message: "No hay una ronda de apuestas activa."
    };
  }

  const player = getCurrentPokerPlayer(game);

  if (!player || player.id !== socketId) {
    return {
      ok: false,
      message: "Todavía no es tu turno."
    };
  }

  const availableActions = getPokerAvailableActions(game, socketId);
  const callAmount = getPokerCallAmount(game, player);

  if (action === "fold") {
    player.folded = true;
    player.hasActed = true;

    game.poker.message = `${player.name} se retiró.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "check") {
    if (!availableActions.check) {
      return {
        ok: false,
        message: "No puedes pasar porque hay una apuesta activa."
      };
    }

    player.hasActed = true;
    game.poker.message = `${player.name} pasó.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "call") {
    if (!availableActions.call) {
      return {
        ok: false,
        message: "No hay apuesta para igualar."
      };
    }

    const paid = applyPokerBet(game, player, callAmount);

    player.hasActed = true;
    game.poker.message = `${player.name} igualó ${paid}.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "bet") {
    if (!availableActions.bet) {
      return {
        ok: false,
        message: "No puedes apostar porque ya hay una apuesta activa."
      };
    }

    const targetBet = Math.floor(Number(rawAmount) || 0);
    const maxBet = player.streetBet + player.chips;
    const minBet = game.poker.settings.bigBlind;
    const safeTargetBet = Math.min(targetBet, maxBet);
    const isAllInUnderMinimum = safeTargetBet === maxBet && safeTargetBet > 0;

    if (safeTargetBet < minBet && !isAllInUnderMinimum) {
      return {
        ok: false,
        message: `La apuesta mínima es ${minBet}.`
      };
    }

    const paid = applyPokerBet(game, player, safeTargetBet - player.streetBet);

    game.poker.currentBet = player.streetBet;
    game.poker.minimumRaise = Math.max(game.poker.settings.bigBlind, paid);
    player.hasActed = true;

    markOtherPokerPlayersAsPending(game, player.id);

    game.poker.message = `${player.name} apostó ${player.streetBet}.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "raise") {
    if (!availableActions.raise) {
      return {
        ok: false,
        message: "No puedes subir en este momento."
      };
    }

    const targetBet = Math.floor(Number(rawAmount) || 0);
    const maxBet = player.streetBet + player.chips;
    const minRaiseTo = game.poker.currentBet + game.poker.minimumRaise;
    const safeTargetBet = Math.min(targetBet, maxBet);
    const isAllInUnderMinimum = safeTargetBet === maxBet && safeTargetBet > game.poker.currentBet;

    if (safeTargetBet <= game.poker.currentBet) {
      return {
        ok: false,
        message: "La subida debe ser mayor que la apuesta actual."
      };
    }

    if (safeTargetBet < minRaiseTo && !isAllInUnderMinimum) {
      return {
        ok: false,
        message: `La subida mínima es a ${minRaiseTo}.`
      };
    }

    const previousBet = game.poker.currentBet;

    applyPokerBet(game, player, safeTargetBet - player.streetBet);

    game.poker.currentBet = player.streetBet;
    game.poker.minimumRaise = Math.max(
      game.poker.settings.bigBlind,
      game.poker.currentBet - previousBet
    );

    player.hasActed = true;

    markOtherPokerPlayersAsPending(game, player.id);

    game.poker.message = `${player.name} subió a ${player.streetBet}.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  return {
    ok: false,
    message: "Acción inválida."
  };
}

function getHeadsUpMajorityNeeded(game) {
  const voters = game.players.filter((player) => player.id !== game.heads.currentPlayerId);
  return Math.floor(voters.length / 2) + 1;
}

function getHeadsUpCorrectVotes(game) {
  return Object.keys(game.heads.wordVotes || {}).length;
}

function publicHeadsUpTurn(game, viewerId) {
  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);

  const currentWord = game.heads.words[game.heads.wordIndex] || {
    category: "",
    word: ""
  };

  const isActivePlayer = viewerId === game.heads.currentPlayerId;
  const wordNumber = game.heads.wordIndex + 1;

  return {
    turnNumber: game.heads.currentTurnIndex + 1,
    totalTurns: game.heads.playersOrder.length,
    playerId: game.heads.currentPlayerId,
    playerName: activePlayer ? activePlayer.name : "Jugador",

    wordNumber,
    category: currentWord.category,
    wordText: isActivePlayer ? `Palabra ${wordNumber}` : currentWord.word,
    hiddenForThisPlayer: isActivePlayer,

    durationMs: game.heads.durationMs,
    endAt: game.heads.endAt,

    turnScore: game.heads.turnScore,
    correctCount: game.heads.correctCount,
    passCount: game.heads.passCount,

    canPass: isActivePlayer,
    canVoteCorrect: !isActivePlayer,
    correctVotes: getHeadsUpCorrectVotes(game),
    majorityNeeded: getHeadsUpMajorityNeeded(game),
    hasVotedCorrect: Boolean(game.heads.wordVotes[viewerId])
  };
}

function emitHeadsUpWord(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("heads_up_word", {
      game: publicGame(game),
      turn: publicHeadsUpTurn(game, player.id)
    });
  });
}

function startHeadsUpIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "heads_intro";
  game.heads = {
    playersOrder: game.players.map((player) => player.id),
    currentTurnIndex: -1,
    currentPlayerId: null,
    words: [],
    wordIndex: -1,
    wordVotes: {},
    turnScore: 0,
    correctCount: 0,
    passCount: 0,
    durationMs: getCampaignHeadsUpDuration(game),
    endAt: null,
    turnTimer: null,
    betweenTimer: null,
    awaitingContinue: false,
    lastTurnResult: null,
    open: false,
    wordOpen: false
  };

  io.to(pin).emit("heads_up_intro", {
    game: publicGame(game)
  });
}

function beginHeadsUp(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "heads_up";

  io.to(pin).emit("heads_up_started", {
    game: publicGame(game)
  });

  game.heads.betweenTimer = setTimeout(() => {
    startNextHeadsUpTurn(pin);
  }, 800);
}

function startNextHeadsUpTurn(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;

  clearHeadsUpTimers(game);

  let activePlayer = null;

  while (!activePlayer) {
    game.heads.currentTurnIndex++;

    if (game.heads.currentTurnIndex >= game.heads.playersOrder.length) {
      finishCompleteGame(pin);
      return;
    }

    const playerId = game.heads.playersOrder[game.heads.currentTurnIndex];
    activePlayer = game.players.find((player) => player.id === playerId);
  }

  game.heads.currentPlayerId = activePlayer.id;
  const words = getCampaignHeadsUpWords(game);

  if (!words.length) {
    finishCompleteGame(pin);
    return;
  }

  game.heads.words = shuffleArray(words);
  game.heads.wordIndex = -1;
  game.heads.wordVotes = {};
  game.heads.turnScore = 0;
  game.heads.correctCount = 0;
  game.heads.passCount = 0;
  game.heads.awaitingContinue = false;
  game.heads.lastTurnResult = null;
  game.heads.open = true;
  game.heads.wordOpen = false;
  game.heads.endAt = Date.now() + game.heads.durationMs;

  io.to(pin).emit("heads_up_turn_started", {
    game: publicGame(game),
    playerName: activePlayer.name,
    turnNumber: game.heads.currentTurnIndex + 1,
    totalTurns: game.heads.playersOrder.length
  });

  game.heads.turnTimer = setTimeout(() => {
    finishHeadsUpTurn(pin);
  }, game.heads.durationMs + 250);

  sendNextHeadsUpWord(pin);
}

function sendNextHeadsUpWord(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open) return;

  if (Date.now() >= game.heads.endAt) {
    finishHeadsUpTurn(pin);
    return;
  }

  game.heads.wordIndex++;

  if (game.heads.wordIndex >= game.heads.words.length) {
    const words = getCampaignHeadsUpWords(game);

    if (!words.length) {
      finishHeadsUpTurn(pin);
      return;
    }

    game.heads.words = shuffleArray(words);
    game.heads.wordIndex = 0;
  }

  game.heads.wordVotes = {};
  game.heads.wordOpen = true;

  emitHeadsUpWord(pin, game);
}

function finishHeadsUpWordAsCorrect(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open || !game.heads.wordOpen) return;

  game.heads.wordOpen = false;

  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);
  const currentWord = game.heads.words[game.heads.wordIndex];

  if (activePlayer) {
    activePlayer.score += 100;
    game.heads.turnScore += 100;
    game.heads.correctCount++;
  }

  io.to(pin).emit("heads_up_word_result", {
    game: publicGame(game),
    result: "correct",
    revealedWord: currentWord.word,
    category: currentWord.category,
    wordNumber: game.heads.wordIndex + 1,
    playerId: activePlayer ? activePlayer.id : null,
    playerName: activePlayer ? activePlayer.name : "Jugador",
    correctVotes: getHeadsUpCorrectVotes(game),
    majorityNeeded: getHeadsUpMajorityNeeded(game)
  });

  game.heads.betweenTimer = setTimeout(() => {
    sendNextHeadsUpWord(pin);
  }, 1300);
}

function finishHeadsUpWordAsPassed(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open || !game.heads.wordOpen) return;

  game.heads.wordOpen = false;
  game.heads.passCount++;

  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);
  const currentWord = game.heads.words[game.heads.wordIndex];

  io.to(pin).emit("heads_up_word_result", {
    game: publicGame(game),
    result: "passed",
    revealedWord: currentWord.word,
    category: currentWord.category,
    wordNumber: game.heads.wordIndex + 1,
    playerId: activePlayer ? activePlayer.id : null,
    playerName: activePlayer ? activePlayer.name : "Jugador",
    correctVotes: getHeadsUpCorrectVotes(game),
    majorityNeeded: getHeadsUpMajorityNeeded(game)
  });

  game.heads.betweenTimer = setTimeout(() => {
    sendNextHeadsUpWord(pin);
  }, 1300);
}

function finishHeadsUpTurn(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open) return;

  game.heads.open = false;
  game.heads.wordOpen = false;
  game.heads.awaitingContinue = true;

  clearHeadsUpTimers(game);

  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);
  const result = {
    playerName: activePlayer ? activePlayer.name : "Jugador",
    correctCount: game.heads.correctCount,
    passCount: game.heads.passCount,
    turnScore: game.heads.turnScore,
    ranking: getRanking(game)
  };

  game.heads.lastTurnResult = result;

  io.to(pin).emit("heads_up_turn_result", {
    game: publicGame(game),
    ...result
  });
}

function finishCompleteGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearHeadsUpTimers(game);

  showBetweenGamesScoreboard(pin, "heads");
}

function clearWordConnectTimers(game) {
  if (!game || !game.word) return;

  if (game.word.gameTimer) {
    clearTimeout(game.word.gameTimer);
  }
}

function normalizeWord(word) {
  return String(word || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function canBuildWordFromLetters(word, letters) {
  const available = {};

  letters.forEach((letter) => {
    available[letter] = (available[letter] || 0) + 1;
  });

  for (const letter of word) {
    if (!available[letter]) {
      return false;
    }

    available[letter]--;
  }

  return true;
}

function getWordPoints(word) {
  if (word.length <= 2) return 0;
  if (word.length === 3) return 30;
  if (word.length === 4) return 60;
  if (word.length === 5) return 100;
  return 150;
}

function getPublicWordConnectState(game, viewerId) {
  const playerWords = game.word.wordsByPlayer[viewerId] || [];

  return {
    letters: game.word.puzzle.letters,
    durationMs: game.word.durationMs,
    endAt: game.word.endAt,
    foundWords: playerWords,
    foundCount: playerWords.length,
    ranking: getRanking(game)
  };
}

function startWordConnectIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "word_intro";
  game.word = {
    puzzle: null,
    wordsByPlayer: {},
    durationMs: getCampaignWordConnectDuration(game),
    endAt: null,
    gameTimer: null,
    awaitingContinue: false,
    lastResult: null,
    open: false
  };

  io.to(pin).emit("word_connect_intro", {
    game: publicGame(game)
  });
}

function beginWordConnect(pin) {
  const game = games.get(pin);

  if (!game) return;

  const puzzles = getCampaignWordConnectPuzzles(game);

  if (!puzzles.length) {
    showBetweenGamesScoreboard(pin, "word");

    return;
  }

  const [puzzle] = shuffleArray(puzzles);

  game.status = "word_connect";
  game.word.puzzle = {
    letters: puzzle.letters,
    validWords: puzzle.validWords.map(normalizeWord)
  };
  game.word.wordsByPlayer = {};
  game.word.endAt = Date.now() + game.word.durationMs;
  game.word.awaitingContinue = false;
  game.word.lastResult = null;
  game.word.open = true;

  game.players.forEach((player) => {
    game.word.wordsByPlayer[player.id] = [];
  });

  game.players.forEach((player) => {
    io.to(player.id).emit("word_connect_started", {
      game: publicGame(game),
      wordState: getPublicWordConnectState(game, player.id)
    });
  });

  game.word.gameTimer = setTimeout(() => {
    finishWordConnect(pin);
  }, game.word.durationMs + 250);
}

function finishWordConnect(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "word_connect" || !game.word) return;
  if (!game.word.open) return;

  game.word.open = false;
  game.word.awaitingContinue = true;

  clearWordConnectTimers(game);

  const playerResults = game.players.map((player) => {
    const words = game.word.wordsByPlayer[player.id] || [];

    const points = words.reduce((total, item) => {
      return total + item.points;
    }, 0);

    return {
      playerId: player.id,
      playerName: player.name,
      words,
      wordCount: words.length,
      points,
      totalScore: player.score
    };
  });

  const result = {
    letters: game.word.puzzle.letters,
    validWords: game.word.puzzle.validWords,
    playerResults,
    ranking: getRanking(game)
  };

  game.word.lastResult = result;

  io.to(pin).emit("word_connect_finished", {
    game: publicGame(game),
    ...result
  });

}

function startPokerIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  const settings = sanitizePokerSettings(null, game);

  game.status = "poker_intro";
  game.poker = {
    settings,
    roundNumber: 0,
    tableReady: false
  };

  io.to(pin).emit("poker_intro", {
    game: publicGame(game),
    settings
  });
}

function updatePokerSettings(pin, rawSettings) {
  const game = games.get(pin);

  if (!game || game.status !== "poker_intro" || !game.poker) {
    return {
      ok: false,
      message: "La configuración de Poker no está disponible."
    };
  }

  game.poker.settings = sanitizePokerSettings(rawSettings, game);

  io.to(pin).emit("poker_settings_updated", {
    game: publicGame(game),
    settings: game.poker.settings
  });

  return {
    ok: true,
    settings: game.poker.settings
  };
}

function showPokerRankings(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker_intro" || !game.poker) return;

  game.status = "poker_rankings";

  io.to(pin).emit("poker_rankings", {
    game: publicGame(game),
    rankings: POKER_HAND_RANKINGS
  });
}

function beginPoker(pin) {
  const game = games.get(pin);

  if (
    !game ||
    !["poker_intro", "poker_rankings"].includes(game.status) ||
    !game.poker
  ) {
    return;
  }

  game.status = "poker";

  game.poker.roundNumber = 0;
  game.poker.dealerIndex = 0;
  game.poker.players = game.players.map((player, index) => ({
    id: player.id,
    name: player.name,
    seat: index,
    chips: game.poker.settings.initialChips,
    hand: [],
    committed: 0,
    folded: false,
    allIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false
  }));

  startPokerHand(pin);
}

function startPokerHand(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  clearPokerActionTimer(game);

  game.poker.players.forEach((player) => {
    if (player.chips <= 0) {
      player.isOut = true;
      player.folded = true;
      player.hand = [];
    }
  });

  const activeIndexes = getPokerActivePlayerIndexes(game);

  if (activeIndexes.length < 2) {
    finishPokerGame(pin);
    return;
  }

  if (game.poker.roundNumber >= game.poker.settings.totalRounds) {
    finishPokerGame(pin);
    return;
  }

  game.poker.roundNumber++;
  game.poker.deck = createPokerDeck();
  game.poker.communityCards = [];
  game.poker.pot = 0;
  game.poker.stage = "preflop";
  game.poker.message = "Preflop.";
  game.poker.showdown = false;
  game.poker.showdownResults = [];
  game.poker.payouts = {};
  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
  game.poker.actionTimer = null;
  game.poker.actionEndsAt = null;

  const seats = getPokerSeatIndexesForHand(game);

  game.poker.dealerIndex = seats.dealerIndex;
  game.poker.smallBlindIndex = seats.smallBlindIndex;
  game.poker.bigBlindIndex = seats.bigBlindIndex;

  game.poker.players.forEach((player, index) => {
    const isActive = activeIndexes.includes(index);

    player.hand = isActive
      ? [drawPokerCard(game), drawPokerCard(game)].filter(Boolean)
      : [];

    player.committed = 0;
    player.streetBet = 0;
    player.hasActed = false;
    player.folded = !isActive;
    player.allIn = false;
    player.bestHand = null;
    player.isOut = !isActive;
    player.isDealer = index === seats.dealerIndex;
    player.isSmallBlind = index === seats.smallBlindIndex;
    player.isBigBlind = index === seats.bigBlindIndex;
  });

  postPokerBlind(game, seats.smallBlindIndex, game.poker.settings.smallBlind);
  postPokerBlind(game, seats.bigBlindIndex, game.poker.settings.bigBlind);

  const smallBlindPlayer = game.poker.players[seats.smallBlindIndex];
  const bigBlindPlayer = game.poker.players[seats.bigBlindIndex];

  game.poker.currentBet = Math.max(
    ...game.poker.players.map((player) => player.streetBet || 0)
  );

  game.poker.currentPlayerIndex = getFirstPokerPlayerToActIndex(game);

  const currentPlayer = getCurrentPokerPlayer(game);

  if (currentPlayer) {
    startPokerActionTimer(pin);
  }

  emitPokerState(pin, game);
}

function nextPokerHand(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) {
    return {
      ok: false,
      message: "Poker no está activo."
    };
  }

  if (game.poker.stage !== "hand_finished") {
    return {
      ok: false,
      message: "Primero debe terminar la mano actual."
    };
  }

  game.poker.dealerIndex = (game.poker.dealerIndex + 1) % game.poker.players.length;

  startPokerHand(pin);

  return {
    ok: true
  };
}

function finishPokerGame(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  clearPokerActionTimer(game);

  game.status = "poker_finished";

  const rankedPlayers = [...game.poker.players]
    .sort((a, b) => b.chips - a.chips);
  const pokerRewards = [1000, 500];

  rankedPlayers.slice(0, pokerRewards.length).forEach((pokerPlayer, index) => {
    const player = game.players.find((item) => item.id === pokerPlayer.id);

    if (player) {
      player.score += pokerRewards[index];
    }
  });

  const ranking = rankedPlayers
    .map((player, index) => ({
      position: index + 1,
      name: player.name,
      score: player.chips,
      pointsAwarded: pokerRewards[index] || 0
    }));

  const winner = ranking[0];

  io.to(pin).emit("poker_finished", {
    game: publicGame(game),
    ranking,
    message: winner
      ? `Poker terminado. Ganador: ${winner.name} con ${winner.score} fichas.`
      : "Poker terminado."
  });

  setTimeout(() => {
    showBetweenGamesScoreboard(pin, "poker");
  }, 2000);
}

function getPublicPokerState(game, viewerId) {
  const viewerPokerPlayer = getPokerPlayer(game, viewerId);
  const currentPlayer = getCurrentPokerPlayer(game);
  const isShowdown = ["showdown", "hand_finished"].includes(game.poker.stage);
  const availableActions = getPokerAvailableActions(game, viewerId);
  const activePlayersCount = getPokerActivePlayerIndexes(game).length;

  return {
    stage: game.poker.stage,
    stageLabel: getPokerStageLabel(game.poker.stage),
    nextRevealLabel: getNextPokerRevealLabel(game.poker.stage),

    roundNumber: game.poker.roundNumber,
    totalRounds: game.poker.settings.totalRounds,

    smallBlind: game.poker.settings.smallBlind,
    bigBlind: game.poker.settings.bigBlind,

    pot: game.poker.pot,
    currentBet: game.poker.currentBet,
    minimumRaise: game.poker.minimumRaise,

    communityCards: game.poker.communityCards.filter(Boolean),
    yourCards: viewerPokerPlayer ? viewerPokerPlayer.hand.filter(Boolean) : [],
    yourChips: viewerPokerPlayer ? viewerPokerPlayer.chips : 0,

    lastActionMessage: game.poker.message,
    message: game.poker.message,
    showdown: isShowdown,

    showdownResults: game.poker.showdownResults || [],
    payouts: game.poker.payouts || {},

    currentPlayerId: currentPlayer ? currentPlayer.id : null,
    currentPlayerName: currentPlayer ? currentPlayer.name : null,
    isYourTurn: currentPlayer ? currentPlayer.id === viewerId : false,

    availableActions,

    actionEndsAt: game.poker.actionEndsAt || null,
    activePlayersCount,

    canAdvanceStage: false,
    canStartNextHand:
      game.leaderId === viewerId &&
      game.poker.stage === "hand_finished" &&
      game.poker.roundNumber < game.poker.settings.totalRounds,

    canFinishPoker:
      game.leaderId === viewerId &&
      ["showdown", "hand_finished"].includes(game.poker.stage),

    players: game.poker.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      chips: player.chips,
      committed: player.committed,
      streetBet: player.streetBet,
      folded: player.folded,
      allIn: player.allIn,
      isOut: Boolean(player.isOut),
      hasActed: player.hasActed,
      isDealer: player.isDealer,
      isSmallBlind: player.isSmallBlind,
      isBigBlind: player.isBigBlind,
      isCurrentPlayer: currentPlayer ? player.id === currentPlayer.id : false,
      isYou: player.id === viewerId,
      cardCount: player.hand.length,
      revealedCards: isShowdown ? player.hand.filter(Boolean) : [],
      bestHandName: player.bestHand ? player.bestHand.name : "",
      bestHandDescription: player.bestHand ? player.bestHand.description : "",
      payout: game.poker.payouts ? game.poker.payouts[player.id] || 0 : 0
    }))
  };
}

function emitPokerState(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("poker_state", {
      game: publicGame(game),
      pokerState: getPublicPokerState(game, player.id)
    });
  });
}

function moveObjectKey(object, oldKey, newKey) {
  if (!object || oldKey === newKey || object[oldKey] === undefined) return;

  object[newKey] = object[oldKey];
  delete object[oldKey];
}

function replaceObjectValue(object, oldValue, newValue) {
  if (!object || oldValue === newValue) return;

  Object.keys(object).forEach((key) => {
    if (object[key] === oldValue) {
      object[key] = newValue;
    }
  });
}

function reassignPlayerSocket(game, player, newSocketId) {
  if (!game || !player || !newSocketId || player.id === newSocketId) return;

  const oldSocketId = player.id;

  player.id = newSocketId;

  if (game.leaderId === oldSocketId) {
    game.leaderId = newSocketId;
  }

  moveObjectKey(game.themeVotes, oldSocketId, newSocketId);

  if (game.trivia) {
    moveObjectKey(game.trivia.answers, oldSocketId, newSocketId);
  }

  if (game.friend) {
    moveObjectKey(game.friend.votes, oldSocketId, newSocketId);
  }

  if (game.heads) {
    game.heads.playersOrder = (game.heads.playersOrder || []).map((playerId) => {
      return playerId === oldSocketId ? newSocketId : playerId;
    });

    if (game.heads.currentPlayerId === oldSocketId) {
      game.heads.currentPlayerId = newSocketId;
    }

    moveObjectKey(game.heads.wordVotes, oldSocketId, newSocketId);
  }

  if (game.word) {
    moveObjectKey(game.word.wordsByPlayer, oldSocketId, newSocketId);
  }

  if (game.poker && Array.isArray(game.poker.players)) {
    const pokerPlayer = getPokerPlayer(game, oldSocketId);

    if (pokerPlayer) {
      pokerPlayer.id = newSocketId;
    }
  }
}

function sendCurrentStateToSocket(pin, socket, game) {
  if (!game) return;

  if (game.status === "lobby") {
    socket.emit("game_updated", publicGame(game));
    return;
  }

  if (game.status === "theme_vote") {
    socket.emit("theme_vote_started", {
      game: publicGame(game),
      themes: getCampaignThemes(game),
      votes: getThemeVoteCounts(game)
    });
    return;
  }

  if (game.status === "trivia" && game.trivia && game.trivia.questionOpen) {
    socket.emit("trivia_question", {
      game: publicGame(game),
      question: publicQuestion(game)
    });
    return;
  }

  if (game.status === "friend_intro") {
    socket.emit("friend_trivia_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "friend_trivia" && game.friend && game.friend.awaitingContinue && game.friend.lastResult) {
    socket.emit("friend_question_result", {
      game: publicGame(game),
      ...game.friend.lastResult
    });
    return;
  }

  if (game.status === "friend_trivia" && game.friend && game.friend.questionOpen) {
    socket.emit("friend_question", {
      game: publicGame(game),
      question: publicFriendQuestion(game)
    });
    return;
  }

  if (game.status === "heads_intro") {
    socket.emit("heads_up_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "heads_up" && game.heads && game.heads.awaitingContinue && game.heads.lastTurnResult) {
    socket.emit("heads_up_turn_result", {
      game: publicGame(game),
      ...game.heads.lastTurnResult
    });
    return;
  }

  if (game.status === "heads_up" && game.heads && game.heads.open) {
    socket.emit("heads_up_word", {
      game: publicGame(game),
      turn: publicHeadsUpTurn(game, socket.id)
    });
    return;
  }

  if (game.status === "word_intro") {
    socket.emit("word_connect_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "word_connect" && game.word && game.word.awaitingContinue && game.word.lastResult) {
    socket.emit("word_connect_finished", {
      game: publicGame(game),
      ...game.word.lastResult
    });
    return;
  }

  if (game.status === "word_connect" && game.word && game.word.open) {
    socket.emit("word_connect_started", {
      game: publicGame(game),
      wordState: getPublicWordConnectState(game, socket.id)
    });
    return;
  }

  if (game.status === "poker_intro") {
    socket.emit("poker_intro", {
      game: publicGame(game),
      settings: game.poker?.settings || sanitizePokerSettings(null, game)
    });
    return;
  }

  if (game.status === "poker_rankings") {
    socket.emit("poker_rankings", {
      game: publicGame(game),
      rankings: POKER_HAND_RANKINGS
    });
    return;
  }

  if (game.status === "poker" && game.poker) {
    socket.emit("poker_state", {
      game: publicGame(game),
      pokerState: getPublicPokerState(game, socket.id)
    });
    return;
  }

  if (game.status === "between_games") {
    socket.emit("between_games_scoreboard", {
      game: publicGame(game),
      finishedGameId: game.betweenGames?.finishedGameId || getCurrentSelectedGameId(game),
      finishedGameName: GAME_LABELS[game.betweenGames?.finishedGameId] || "Juego",
      hasNextGame: Boolean(game.betweenGames?.hasNextGame),
      ranking: getRanking(game)
    });
  }
}

function finishFinalGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearAllGameTimers(game);

  const ranking = getRanking(game);

  game.status = "lobby";
  game.selectedTheme = null;
  game.currentGameIndex = -1;
  game.themeVotes = {};
  game.trivia = null;
  game.friend = null;
  game.heads = null;
  game.word = null;
  game.poker = null;
  game.betweenGames = null;

  io.to(pin).emit("game_finished", {
    game: publicGame(game),
    ranking
  });
}

function clearAllGameTimers(game) {
  clearTriviaTimers(game);
  clearFriendTimers(game);
  clearHeadsUpTimers(game);
  clearLackPlayersTimer(game);

  if (typeof clearWordConnectTimers === "function") {
    clearWordConnectTimers(game);
  }

  if (typeof clearPokerActionTimer === "function") {
    clearPokerActionTimer(game);
  }
}

function getConnectedPlayers(game) {
  if (!game || !Array.isArray(game.players)) return [];

  return game.players.filter((player) => player.connected !== false);
}

function haveAllConnectedPlayersResponded(game, responses) {
  const connectedPlayers = getConnectedPlayers(game);

  return (
    connectedPlayers.length >= MIN_CONNECTED_PLAYERS &&
    connectedPlayers.every((player) => responses && responses[player.id] !== undefined)
  );
}

function clearLackPlayersTimer(game) {
  if (!game || !game.lackPlayersTimer) return;

  clearTimeout(game.lackPlayersTimer);
  game.lackPlayersTimer = null;
}

function updateLackPlayersCountdown(pin) {
  const game = games.get(pin);

  if (!game) return;

  if (game.status === "lobby" || getConnectedPlayers(game).length >= MIN_CONNECTED_PLAYERS) {
    clearLackPlayersTimer(game);
    return;
  }

  if (game.lackPlayersTimer) return;

  game.lackPlayersTimer = setTimeout(() => {
    const latestGame = games.get(pin);

    if (!latestGame) return;

    latestGame.lackPlayersTimer = null;

    if (
      latestGame.status !== "lobby" &&
      getConnectedPlayers(latestGame).length < MIN_CONNECTED_PLAYERS
    ) {
      cancelGameDueToLackOfPlayers(pin);
    }
  }, LACK_PLAYERS_GRACE_MS);
}

function cancelGameDueToLackOfPlayers(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearAllGameTimers(game);

  game.status = "cancelled_lack_players";

  io.to(pin).emit("game_cancelled_lack_players", {
    game: publicGame(game),
    message: "La partida terminó porque no hay suficientes jugadores conectados."
  });

  games.delete(pin);
}

function isFriendTriviaActiveOrIntro(game) {
  return (
    game.status === "friend_intro" ||
    game.status === "friend_trivia" ||
    game.status === "friend_result"
  );
}

function removeFriendTriviaFromQueue(game) {
  if (!game || !Array.isArray(game.selectedGames)) return false;

  const friendIndex = game.selectedGames.indexOf("friend");

  if (friendIndex === -1) return false;

  game.selectedGames.splice(friendIndex, 1);

  if (friendIndex <= game.currentGameIndex) {
    game.currentGameIndex -= 1;
  }

  return true;
}

function removePendingFriendTriviaIfNeeded(pin) {
  const game = games.get(pin);

  if (!game) return false;
  if (game.players.length >= 3) return false;
  if (!Array.isArray(game.selectedGames)) return false;

  const friendIndex = game.selectedGames.indexOf("friend");

  if (friendIndex === -1) return false;

  const friendAlreadyPassed = friendIndex <= game.currentGameIndex;
  const friendIsCurrent = isFriendTriviaActiveOrIntro(game);

  if (friendIsCurrent) return false;
  if (friendAlreadyPassed) return false;

  game.selectedGames.splice(friendIndex, 1);

  io.to(pin).emit("game_updated", publicGame(game));

  return true;
}

function cancelCurrentFriendTriviaIfNeeded(pin) {
  const game = games.get(pin);

  if (!game) return false;
  if (game.players.length >= 3) return false;
  if (!isFriendTriviaActiveOrIntro(game)) return false;

  clearFriendTimers(game);
  removeFriendTriviaFromQueue(game);

  game.status = "friend_cancelled_insufficient_players";

  io.to(pin).emit("friend_trivia_cancelled_insufficient_players", {
    game: publicGame(game),
    message: "Votazo se canceló porque no hay suficientes jugadores conectados."
  });

  setTimeout(() => {
    const latestGame = games.get(pin);

    if (!latestGame) return;
    if (latestGame.status !== "friend_cancelled_insufficient_players") return;

    if (latestGame.players.length <= 1) {
      cancelGameDueToLackOfPlayers(pin);
      return;
    }

    startNextSelectedGame(pin);
  }, 3000);

  return true;
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("create_game", ({ name, campaignSlug, clientId }, callback) => {
    const pin = generatePin();
    const cleanPlayerClientId = cleanClientId(clientId) || socket.id;

    const player = {
      id: socket.id,
      clientId: cleanPlayerClientId,
      name: cleanName(name) || "Líder",
      score: 0,
      connected: true
    };

    const campaign = loadCampaign(campaignSlug || DEFAULT_CAMPAIGN_SLUG);

    const game = {
      pin,
      leaderId: socket.id,
      status: "lobby",
      selectedTheme: null,
      selectedGames: sanitizeSelectedGames(
        campaign.games?.defaultSelected || DEFAULT_SELECTED_GAMES,
        1,
        campaign
      ),
      currentGameIndex: -1,
      players: [player],
      themeVotes: {},
      trivia: null,
      friend: null,
      heads: null,
      word: null,
      lackPlayersTimer: null,
      campaignSlug: campaign.slug,
      campaign
    };

    games.set(pin, game);

    socket.join(pin);
    socket.data.pin = pin;
    socket.data.clientId = cleanPlayerClientId;

    callback({
      ok: true,
      game: publicGame(game)
    });

    io.to(pin).emit("game_updated", publicGame(game));
  });

  socket.on("join_game", ({ pin, name, clientId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const cleanPlayerClientId = cleanClientId(clientId) || socket.id;

    if (!game) {
      callback({
        ok: false,
        message: "Ese PIN no existe."
      });
      return;
    }

    const returningPlayer = game.players.find((player) => {
      return player.clientId && player.clientId === cleanPlayerClientId;
    });

    if (returningPlayer) {
      reassignPlayerSocket(game, returningPlayer, socket.id);
      returningPlayer.name = cleanName(name) || returningPlayer.name;
      returningPlayer.connected = true;
      returningPlayer.disconnectedAt = null;
      updateLackPlayersCountdown(cleanGamePin);

      socket.join(cleanGamePin);
      socket.data.pin = cleanGamePin;
      socket.data.clientId = cleanPlayerClientId;

      callback({
        ok: true,
        game: publicGame(game)
      });

      sendCurrentStateToSocket(cleanGamePin, socket, game);
      io.to(cleanGamePin).emit("game_updated", publicGame(game));
      return;
    }

    if (game.status !== "lobby") {
      callback({
        ok: false,
        message: "La partida ya inició."
      });
      return;
    }

    const player = {
      id: socket.id,
      clientId: cleanPlayerClientId,
      name: cleanName(name) || "Jugador",
      score: 0,
      connected: true
    };

    const alreadyInside = game.players.some((p) => p.id === socket.id);

    if (!alreadyInside) {
      game.players.push(player);
    }

    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

    socket.join(cleanGamePin);
    socket.data.pin = cleanGamePin;
    socket.data.clientId = cleanPlayerClientId;

    callback({
      ok: true,
      game: publicGame(game)
    });

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("resume_game", ({ pin, clientId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const cleanPlayerClientId = cleanClientId(clientId);
    const game = games.get(cleanGamePin);

    if (!game || !cleanPlayerClientId) {
      callback({
        ok: false,
        message: "No se pudo reanudar la partida."
      });
      return;
    }

    const player = game.players.find((item) => item.clientId === cleanPlayerClientId);

    if (!player) {
      callback({
        ok: false,
        message: "No se encontró tu jugador en esta partida."
      });
      return;
    }

    reassignPlayerSocket(game, player, socket.id);
    player.connected = true;
    player.disconnectedAt = null;
    updateLackPlayersCountdown(cleanGamePin);

    socket.join(cleanGamePin);
    socket.data.pin = cleanGamePin;
    socket.data.clientId = cleanPlayerClientId;

    callback({
      ok: true,
      game: publicGame(game)
    });

    sendCurrentStateToSocket(cleanGamePin, socket, game);
  });

  socket.on("update_selected_games", ({ pin, selectedGames }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.status !== "lobby") {
      callback({
        ok: false,
        message: "Solo puedes cambiar juegos en el lobby."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede elegir juegos."
      });
      return;
    }

    game.selectedGames = sanitizeSelectedGames(selectedGames, game.players.length, game.campaign);

    callback({
      ok: true,
      selectedGames: game.selectedGames
    });

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("remove_player", ({ pin, playerId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.status !== "lobby") {
      callback({
        ok: false,
        message: "Solo puedes eliminar jugadores en el lobby."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede eliminar jugadores."
      });
      return;
    }

    if (!playerId || playerId === game.leaderId) {
      callback({
        ok: false,
        message: "No puedes eliminar al líder de la partida."
      });
      return;
    }

    const playerExists = game.players.some((player) => player.id === playerId);

    if (!playerExists) {
      callback({
        ok: false,
        message: "Ese jugador ya no está en la partida."
      });
      return;
    }

    game.players = game.players.filter((player) => player.id !== playerId);
    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

    const removedSocket = io.sockets.sockets.get(playerId);

    if (removedSocket) {
      removedSocket.emit("removed_from_game", {
        message: "El líder te eliminó de la partida."
      });
      removedSocket.leave(cleanGamePin);
      removedSocket.data.pin = null;
    }

    callback({
      ok: true
    });

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("start_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede iniciar la partida."
      });
      return;
    }

    if (game.players.length < 2) {
      callback({
        ok: false,
        message: "Necesitas al menos 2 jugadores para iniciar."
      });
      return;
    }

    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

    if (!game.selectedGames.length) {
      callback({
        ok: false,
        message: "Selecciona al menos un juego."
      });
      return;
    }

    game.players.forEach((player) => {
      player.score = 0;
    });
    game.currentGameIndex = -1;

    callback({
      ok: true
    });

    startNextSelectedGame(cleanGamePin);
  });

  socket.on("continue_after_scoreboard", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "between_games") {
      callback({
        ok: false,
        message: "El marcador de la partida no está activo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    const hasNextGame = Boolean(game.betweenGames && game.betweenGames.hasNextGame);

    callback({
      ok: true
    });

    if (hasNextGame) {
      startNextSelectedGame(cleanGamePin);
      return;
    }

    finishFinalGame(cleanGamePin);
  });

  socket.on("submit_theme_vote", ({ pin, theme }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.status !== "theme_vote") {
      callback({
        ok: false,
        message: "La votación de tema no está activa."
      });
      return;
    }

    const validTheme = getCampaignThemes(game).some((item) => item.id === theme);

    if (!validTheme) {
      callback({
        ok: false,
        message: "Ese tema no existe."
      });
      return;
    }

    game.themeVotes[socket.id] = theme;

    callback({
      ok: true
    });

    io.to(cleanGamePin).emit("theme_votes_updated", {
      votes: getThemeVoteCounts(game),
      totalVotes: Object.keys(game.themeVotes).length,
      totalPlayers: game.players.length
    });

    const allPlayersVoted = haveAllConnectedPlayersResponded(game, game.themeVotes);

    if (allPlayersVoted) {
      startTrivia(cleanGamePin);
    }
  });

  socket.on("submit_answer", ({ pin, optionIndex }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "trivia" || !game.trivia) {
      callback({
        ok: false,
        message: "La trivia no está activa."
      });
      return;
    }

    if (!game.trivia.questionOpen) {
      callback({
        ok: false,
        message: "La pregunta ya se cerró."
      });
      return;
    }

    if (game.trivia.answers[socket.id]) {
      callback({
        ok: false,
        message: "Ya respondiste esta pregunta."
      });
      return;
    }

    const player = game.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({
        ok: false,
        message: "No estás dentro de la partida."
      });
      return;
    }

    const questions = game.trivia.questions || [];
    const question = questions[game.trivia.currentQuestionIndex];

    const numericOptionIndex = Number(optionIndex);

    if (!question.options[numericOptionIndex]) {
      callback({
        ok: false,
        message: "Respuesta inválida."
      });
      return;
    }

    const elapsed = Date.now() - game.trivia.questionStartTime;
    const isCorrect = numericOptionIndex === question.correctIndex;

    let points = 0;

    if (isCorrect) {
      const speedRatio = Math.max(0, 1 - elapsed / game.trivia.durationMs);
      const speedBonus = Math.round(50 * speedRatio);
      points = 100 + speedBonus;
      player.score += points;
    }

    game.trivia.answers[socket.id] = {
      optionIndex: numericOptionIndex,
      correct: isCorrect,
      points
    };

    callback({
      ok: true,
      message: "Respuesta recibida."
    });

    if (haveAllConnectedPlayersResponded(game, game.trivia.answers)) {
      finishQuestion(cleanGamePin);
    }
  });

  socket.on("start_friend_trivia_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "friend_intro") {
      callback({
        ok: false,
        message: "Votazo todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar Votazo."
      });
      return;
    }

    callback({
      ok: true
    });

    startFriendTrivia(cleanGamePin);
  });

  socket.on("submit_friend_vote", ({ pin, optionId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "friend_trivia" || !game.friend) {
      callback({
        ok: false,
        message: "Votazo no está activo."
      });
      return;
    }

    if (!game.friend.questionOpen) {
      callback({
        ok: false,
        message: "La pregunta ya se cerró."
      });
      return;
    }

    if (game.friend.votes[socket.id]) {
      callback({
        ok: false,
        message: "Ya votaste esta pregunta."
      });
      return;
    }

    const voter = game.players.find((player) => player.id === socket.id);
    const currentQuestion = game.friend.questions[game.friend.currentQuestionIndex];
    const options = getVotazoOptions(currentQuestion);
    const selectedOptionId = String(optionId ?? "");
    const selectedOption = options.find((option) => option.id === selectedOptionId);

    if (!voter) {
      callback({
        ok: false,
        message: "No estás dentro de la partida."
      });
      return;
    }

    if (!selectedOption) {
      callback({
        ok: false,
        message: "Esa opción no existe."
      });
      return;
    }

    game.friend.votes[socket.id] = selectedOption.id;

    callback({
      ok: true,
      message: "Voto recibido."
    });

    if (haveAllConnectedPlayersResponded(game, game.friend.votes)) {
      finishFriendQuestion(cleanGamePin);
    }
  });

  socket.on("continue_friend_question", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "friend_trivia" || !game.friend || !game.friend.awaitingContinue) {
      callback({
        ok: false,
        message: "Votazo todavía no está listo para continuar."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    game.friend.awaitingContinue = false;

    callback({
      ok: true
    });

    if (game.friend.currentQuestionIndex >= game.friend.questions.length - 1) {
      showBetweenGamesScoreboard(cleanGamePin, "friend");
      return;
    }

    nextFriendQuestion(cleanGamePin);
  });

  socket.on("start_heads_up_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "heads_intro" || !game.heads) {
      callback({
        ok: false,
        message: "Heads Up todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar Heads Up."
      });
      return;
    }

    callback({
      ok: true
    });

    beginHeadsUp(cleanGamePin);
  });

  socket.on("submit_heads_up_action", ({ pin, action }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "heads_up" || !game.heads) {
      callback({
        ok: false,
        message: "Heads Up no está activo."
      });
      return;
    }

    if (!game.heads.open || !game.heads.wordOpen) {
      callback({
        ok: false,
        message: "La palabra ya no está activa."
      });
      return;
    }

    if (Date.now() >= game.heads.endAt) {
      finishHeadsUpTurn(cleanGamePin);

      callback({
        ok: false,
        message: "El tiempo terminó."
      });
      return;
    }

    const activePlayerId = game.heads.currentPlayerId;
    const isActivePlayer = socket.id === activePlayerId;

    if (action === "pass") {
      if (!isActivePlayer) {
        callback({
          ok: false,
          message: "Solo el jugador de turno puede pasar."
        });
        return;
      }

      callback({
        ok: true
      });

      finishHeadsUpWordAsPassed(cleanGamePin);
      return;
    }

    if (action === "correct_vote") {
      if (isActivePlayer) {
        callback({
          ok: false,
          message: "El jugador de turno no puede votar correcto."
        });
        return;
      }

      const voter = game.players.find((player) => player.id === socket.id);

      if (!voter) {
        callback({
          ok: false,
          message: "No estás dentro de la partida."
        });
        return;
      }

      if (game.heads.wordVotes[socket.id]) {
        callback({
          ok: false,
          message: "Ya votaste correcto en esta palabra."
        });
        return;
      }

      game.heads.wordVotes[socket.id] = true;

      const correctVotes = getHeadsUpCorrectVotes(game);
      const majorityNeeded = getHeadsUpMajorityNeeded(game);

      callback({
        ok: true,
        correctVotes,
        majorityNeeded
      });

      io.to(cleanGamePin).emit("heads_up_votes_updated", {
        correctVotes,
        majorityNeeded
      });

      if (correctVotes >= majorityNeeded) {
        finishHeadsUpWordAsCorrect(cleanGamePin);
      }

      return;
    }

    callback({
      ok: false,
      message: "Acción inválida."
    });
  });

  socket.on("continue_heads_up_turn", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "heads_up" || !game.heads || !game.heads.awaitingContinue) {
      callback({
        ok: false,
        message: "Heads Up todavía no está listo para continuar."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    game.heads.awaitingContinue = false;

    callback({
      ok: true
    });

    startNextHeadsUpTurn(cleanGamePin);
  });

  socket.on("start_word_connect_game", ({ pin }, callback) => {
  const cleanGamePin = cleanPin(pin);
  const game = games.get(cleanGamePin);

  if (!game || game.status !== "word_intro" || !game.word) {
    callback({
      ok: false,
      message: "Word Connect todavía no está listo."
    });
    return;
  }

  if (game.leaderId !== socket.id) {
    callback({
      ok: false,
      message: "Solo el líder puede empezar Word Connect."
    });
    return;
  }

  callback({
    ok: true
  });

  beginWordConnect(cleanGamePin);
});

socket.on("submit_word_connect_word", ({ pin, word }, callback) => {
  const cleanGamePin = cleanPin(pin);
  const game = games.get(cleanGamePin);

  if (!game || game.status !== "word_connect" || !game.word) {
    callback({
      ok: false,
      message: "Word Connect no está activo."
    });
    return;
  }

  if (!game.word.open) {
    callback({
      ok: false,
      message: "La ronda ya terminó."
    });
    return;
  }

  if (Date.now() >= game.word.endAt) {
    finishWordConnect(cleanGamePin);

    callback({
      ok: false,
      message: "El tiempo terminó."
    });
    return;
  }

  const player = game.players.find((item) => item.id === socket.id);

  if (!player) {
    callback({
      ok: false,
      message: "No estás dentro de la partida."
    });
    return;
  }

  const cleanWord = normalizeWord(word);

  if (cleanWord.length < 3) {
    callback({
      ok: false,
      message: "La palabra debe tener mínimo 3 letras."
    });
    return;
  }

  if (!canBuildWordFromLetters(cleanWord, game.word.puzzle.letters)) {
    callback({
      ok: false,
      message: "Esa palabra usa letras que no están disponibles."
    });
    return;
  }

  if (!game.word.puzzle.validWords.includes(cleanWord)) {
    callback({
      ok: false,
      message: "Esa palabra no está en la lista válida."
    });
    return;
  }

  const playerWords = game.word.wordsByPlayer[player.id] || [];
  const alreadyFound = playerWords.some((item) => item.word === cleanWord);

  if (alreadyFound) {
    callback({
      ok: false,
      message: "Ya encontraste esa palabra."
    });
    return;
  }

  const points = getWordPoints(cleanWord);

  player.score += points;

  const wordResult = {
    word: cleanWord,
    points
  };

  playerWords.push(wordResult);
  game.word.wordsByPlayer[player.id] = playerWords;

  callback({
    ok: true,
    word: wordResult,
    foundWords: playerWords,
    score: player.score,
    ranking: getRanking(game)
  });

  io.to(cleanGamePin).emit("word_connect_ranking_updated", {
    ranking: getRanking(game)
  });
});

  socket.on("continue_word_connect_result", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "word_connect" || !game.word || !game.word.awaitingContinue) {
      callback({
        ok: false,
        message: "Word Connect todavía no está listo para continuar."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    game.word.awaitingContinue = false;

    callback({
      ok: true
    });

    showBetweenGamesScoreboard(cleanGamePin, "word");
  });

  socket.on("update_poker_settings", ({ pin, settings }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede configurar Poker."
      });
      return;
    }

    const result = updatePokerSettings(cleanGamePin, settings);
    callback(result);
  });

  socket.on("start_poker_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "poker_intro" || !game.poker) {
      callback({
        ok: false,
        message: "Poker todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar Poker."
      });
      return;
    }

    callback({
      ok: true
    });

    showPokerRankings(cleanGamePin);
  });

  socket.on("continue_poker_after_rankings", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "poker_rankings" || !game.poker) {
      callback({
        ok: false,
        message: "La pantalla de ranking de manos no está activa."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    callback({
      ok: true
    });

    beginPoker(cleanGamePin);
  });

  socket.on("next_poker_hand", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede iniciar la siguiente mano."
      });
      return;
    }

    const result = nextPokerHand(cleanGamePin);
    callback(result);
  });

  socket.on("finish_poker_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "poker") {
      callback({
        ok: false,
        message: "Poker no está activo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede terminar Poker."
      });
      return;
    }

    callback({
      ok: true
    });

    finishPokerGame(cleanGamePin);
  });

  socket.on("submit_poker_action", ({ pin, action, amount }, callback) => {
    const cleanGamePin = cleanPin(pin);

    const result = handlePokerAction(cleanGamePin, socket.id, action, amount);

    callback(result);
  });

  socket.on("dev_skip_to", ({ pin, target, theme }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede usar el modo desarrollo."
      });
      return;
    }

    clearTriviaTimers(game);
    clearFriendTimers(game);
    clearHeadsUpTimers(game);

    if (typeof clearWordConnectTimers === "function") {
      clearWordConnectTimers(game);
    }

    game.trivia = null;
    game.friend = null;
    game.heads = null;

    if (game.word !== undefined) {
      game.word = null;
    }

    if (target === "knowledge") {
      const themes = getCampaignThemes(game);
      const selectedTheme = theme || themes[0]?.id || "deportes";

      game.status = "trivia";
      game.selectedTheme = selectedTheme;
      game.trivia = {
        currentQuestionIndex: -1,
        answers: {},
        questionOpen: false,
        questionStartTime: null,
        durationMs: 15000,
        endAt: null,
        questionTimer: null,
        betweenTimer: null
      };

      callback({
        ok: true,
        message: "Saltando a Trivia de conocimiento."
      });

      io.to(cleanGamePin).emit("theme_chosen", {
        theme: selectedTheme,
        themeName: getThemeNameFromCampaign(game, selectedTheme),
        game: publicGame(game)
      });

      game.trivia.betweenTimer = setTimeout(() => {
        nextQuestion(cleanGamePin);
      }, 500);

      return;
    }

    if (target === "friend") {
      callback({
        ok: true,
        message: "Saltando a Votazo."
      });

      startFriendTrivia(cleanGamePin);
      return;
    }

    if (target === "heads-intro") {
      callback({
        ok: true,
        message: "Saltando a instrucciones de Heads Up."
      });

      startHeadsUpIntro(cleanGamePin);
      return;
    }

    if (target === "heads") {
      callback({
        ok: true,
        message: "Saltando directo a Heads Up."
      });

      startHeadsUpIntro(cleanGamePin);

      setTimeout(() => {
        beginHeadsUp(cleanGamePin);
      }, 500);

      return;
    }

    if (target === "word-intro") {
      callback({
        ok: true,
        message: "Saltando a instrucciones de Word Connect."
      });

      startWordConnectIntro(cleanGamePin);
      return;
    }

    if (target === "word") {
      callback({
        ok: true,
        message: "Saltando directo a Word Connect."
      });

      startWordConnectIntro(cleanGamePin);

      setTimeout(() => {
        beginWordConnect(cleanGamePin);
      }, 500);

      return;
    }

    if (target === "final") {
      callback({
        ok: true,
        message: "Finalizando la partida y regresando al lobby."
      });

      finishFinalGame(cleanGamePin);

      return;
    }

    callback({
      ok: false,
      message: "Destino de desarrollo inválido."
    });
  });

  socket.on("disconnect", () => {
    const pin = socket.data.pin;

    if (!pin) return;

    const game = games.get(pin);

    if (!game) return;

    const wasLeader = game.leaderId === socket.id;
    const disconnectingPlayer = game.players.find((player) => player.id === socket.id);

    if (!disconnectingPlayer) return;

    if (game.status !== "lobby") {
      disconnectingPlayer.connected = false;
      disconnectingPlayer.disconnectedAt = Date.now();

      updateLackPlayersCountdown(pin);

      if (
        game.status === "theme_vote" &&
        haveAllConnectedPlayersResponded(game, game.themeVotes)
      ) {
        startTrivia(pin);
        return;
      }

      if (
        game.status === "trivia" &&
        game.trivia &&
        game.trivia.questionOpen &&
        haveAllConnectedPlayersResponded(game, game.trivia.answers)
      ) {
        finishQuestion(pin);
        return;
      }

      if (
        game.status === "friend_trivia" &&
        game.friend &&
        game.friend.questionOpen &&
        haveAllConnectedPlayersResponded(game, game.friend.votes)
      ) {
        finishFriendQuestion(pin);
        return;
      }

      return;
    }

    game.players = game.players.filter((player) => player.id !== socket.id);

    if (game.players.length === 0) {
      clearAllGameTimers(game);
      games.delete(pin);
      return;
    }

    if (game.players.length === 1 && game.status !== "lobby") {
      cancelGameDueToLackOfPlayers(pin);
      return;
    }

    if (game.players.length < 3 && game.status !== "lobby") {
      if (cancelCurrentFriendTriviaIfNeeded(pin)) {
        return;
      }

      removePendingFriendTriviaIfNeeded(pin);
    }

    if (wasLeader) {
      game.leaderId = game.players[0].id;
    }

    if (game.status === "between_games") {
      showBetweenGamesScoreboard(pin, game.betweenGames?.finishedGameId);
      return;
    }

    if (game.status === "theme_vote") {
      const allRemainingPlayersVoted = game.players.every((player) => game.themeVotes[player.id]);

      if (allRemainingPlayersVoted) {
        startTrivia(pin);
        return;
      }
    }

    if (game.status === "trivia" && game.trivia && game.trivia.questionOpen) {
      const answeredPlayers = game.players.filter((player) => game.trivia.answers[player.id]);

      if (answeredPlayers.length >= game.players.length) {
        finishQuestion(pin);
        return;
      }
    }

    if (game.status === "friend_intro") {
      if (game.players.length < 3) {
        startNextSelectedGame(pin);
        return;
      }

      io.to(pin).emit("friend_trivia_intro", {
        game: publicGame(game)
      });

      return;
    }

    if (game.status === "friend_trivia" && game.friend && game.friend.questionOpen) {
      const votedPlayers = game.players.filter((player) => game.friend.votes[player.id]);

      if (votedPlayers.length >= game.players.length) {
        finishFriendQuestion(pin);
        return;
      }
    }

    if (game.status === "heads_intro") {
      io.to(pin).emit("heads_up_intro", {
        game: publicGame(game)
      });
      return;
    }

    if (game.status === "heads_up" && game.heads) {
      if (game.heads.currentPlayerId === socket.id) {
        finishHeadsUpTurn(pin);
        return;
      }

      if (game.heads.wordOpen) {
        const correctVotes = getHeadsUpCorrectVotes(game);
        const majorityNeeded = getHeadsUpMajorityNeeded(game);

        if (correctVotes >= majorityNeeded) {
          finishHeadsUpWordAsCorrect(pin);
          return;
        }

        emitHeadsUpWord(pin, game);
        return;
      }
    }
    
    if (game.status === "word_intro") {
  io.to(pin).emit("word_connect_intro", {
    game: publicGame(game)
  });
  return;
}

if (game.status === "word_connect" && game.word && game.word.open) {
  io.to(pin).emit("word_connect_ranking_updated", {
    ranking: getRanking(game)
  });
  return;
}

if (game.status === "poker" && game.poker) {
  const pokerPlayer = getPokerPlayer(game, socket.id);

  if (pokerPlayer) {
    pokerPlayer.folded = true;
    pokerPlayer.hand = [];
  }

  emitPokerState(pin, game);
  return;
}

    io.to(pin).emit("game_updated", publicGame(game));
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("Servidor iniciado.");
  console.log("");
  console.log("En este computador abre:");
  console.log(`http://localhost:${PORT}/juegos`);
  console.log("");
  console.log("Para celulares en la misma red Wi-Fi, prueba con:");

  const ips = getLocalIPs();

  ips.forEach((ip) => {
    console.log(`http://${ip}:${PORT}/juegos`);
  });

  console.log("");
});
