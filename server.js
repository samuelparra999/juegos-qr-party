const express = require("express");
const http = require("http");
const path = require("path");
const os = require("os");
const QRCode = require("qrcode");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const games = new Map();

const GAME_ORDER = ["knowledge", "friend", "heads", "word"];

const DEFAULT_SELECTED_GAMES = ["knowledge", "heads", "word"];

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

const friendQuestions = [
  "¿Quién del grupo sobreviviría más tiempo en una isla desierta?",
  "¿Quién llegaría tarde a su propia boda?",
  "¿Quién sería el mejor presidente del grupo?",
  "¿Quién se gastaría todo el presupuesto en comida?",
  "¿Quién sería el primero en hacerse famoso?"
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

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.redirect("/juegos");
});

app.get("/juegos", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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

function getThemeName(themeId) {
  const theme = THEMES.find((item) => item.id === themeId);
  return theme ? theme.name : themeId;
}

function getThemeVoteCounts(game) {
  const counts = {};

  THEMES.forEach((theme) => {
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
  const counts = getThemeVoteCounts(game);
  let winner = THEMES[0].id;
  let highestVotes = -1;

  THEMES.forEach((theme) => {
    if (counts[theme.id] > highestVotes) {
      winner = theme.id;
      highestVotes = counts[theme.id];
    }
  });

  return winner;
}

function sanitizeSelectedGames(selectedGames, playerCount) {
  const receivedGames = Array.isArray(selectedGames)
    ? selectedGames
    : DEFAULT_SELECTED_GAMES;

  const allowedGames = receivedGames.filter((gameId) => {
    if (!GAME_ORDER.includes(gameId)) return false;

    if (gameId === "friend" && playerCount < 3) {
      return false;
    }

    return true;
  });

  const orderedGames = GAME_ORDER.filter((gameId) => allowedGames.includes(gameId));

  return orderedGames;
}

function startNextSelectedGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length);

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

    if (nextGame === "friend" && game.players.length < 3) {
      game.currentGameIndex++;
      continue;
    }

    if (nextGame === "knowledge") {
      startKnowledgeThemeVote(pin);
      return;
    }

    if (nextGame === "friend") {
      startFriendTrivia(pin);
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

    game.currentGameIndex++;
  }

  finishFinalGame(pin);
}

function startKnowledgeThemeVote(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "theme_vote";
  game.themeVotes = {};

  io.to(pin).emit("theme_vote_started", {
    game: publicGame(game),
    themes: THEMES,
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
  const questions = triviaQuestions[theme];
  const index = game.trivia.currentQuestionIndex;
  const question = questions[index];

  return {
    index,
    number: index + 1,
    total: questions.length,
    theme,
    themeName: getThemeName(theme),
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

  game.status = "trivia";
  game.selectedTheme = winningTheme;
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

  io.to(pin).emit("theme_chosen", {
    theme: winningTheme,
    themeName: getThemeName(winningTheme),
    game: publicGame(game)
  });

  game.trivia.betweenTimer = setTimeout(() => {
    nextQuestion(pin);
  }, 1200);
}

function nextQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "trivia") return;

  const questions = triviaQuestions[game.selectedTheme];

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

  const questions = triviaQuestions[game.selectedTheme];
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

  setTimeout(() => {
    startNextSelectedGame(pin);
  }, 2500);
}

function publicFriendQuestion(game) {
  const index = game.friend.currentQuestionIndex;
  const question = friendQuestions[index];

  return {
    index,
    number: index + 1,
    total: friendQuestions.length,
    question,
    durationMs: game.friend.durationMs,
    endAt: game.friend.endAt,
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name
    }))
  };
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

function startFriendTrivia(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "friend_trivia";
  game.friend = {
    currentQuestionIndex: -1,
    votes: {},
    questionOpen: false,
    durationMs: 20000,
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

  game.friend.currentQuestionIndex++;

  if (game.friend.currentQuestionIndex >= friendQuestions.length) {
    game.status = "friend_finished";

    setTimeout(() => {
      startNextSelectedGame(pin);
    }, 1500);

    return;
  }

  game.friend.votes = {};
  game.friend.questionOpen = true;
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

  if (game.friend.questionTimer) {
    clearTimeout(game.friend.questionTimer);
    game.friend.questionTimer = null;
  }

  const voteCounts = {};

  game.players.forEach((player) => {
    voteCounts[player.id] = 0;
  });

  Object.values(game.friend.votes).forEach((targetPlayerId) => {
    if (voteCounts[targetPlayerId] !== undefined) {
      voteCounts[targetPlayerId]++;
    }
  });

  const highestVotes = Math.max(...Object.values(voteCounts));
  const winnerIds = highestVotes > 0
    ? Object.keys(voteCounts).filter((playerId) => voteCounts[playerId] === highestVotes)
    : [];

  const winnerNames = game.players
    .filter((player) => winnerIds.includes(player.id))
    .map((player) => player.name);

  const answers = game.players.map((player) => {
    const votedForId = game.friend.votes[player.id];
    const votedForPlayer = game.players.find((item) => item.id === votedForId);

    const votedWinner = winnerIds.includes(votedForId);
    const wasMostVoted = winnerIds.includes(player.id);

    let points = 0;

    if (votedWinner) {
      points += 100;
    }

    if (wasMostVoted) {
      points += 50;
    }

    player.score += points;

    return {
      playerId: player.id,
      playerName: player.name,
      votedForName: votedForPlayer ? votedForPlayer.name : "Sin voto",
      votedWinner,
      wasMostVoted,
      points,
      totalScore: player.score
    };
  });

  io.to(pin).emit("friend_question_result", {
    game: publicGame(game),
    question: friendQuestions[game.friend.currentQuestionIndex],
    winnerNames,
    answers,
    ranking: getRanking(game)
  });

  game.friend.betweenTimer = setTimeout(() => {
    nextFriendQuestion(pin);
  }, 5000);
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
    category: isActivePlayer ? "Incógnita" : currentWord.category,
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
    durationMs: 45000,
    endAt: null,
    turnTimer: null,
    betweenTimer: null,
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
  game.heads.words = shuffleArray(headsUpWords);
  game.heads.wordIndex = -1;
  game.heads.wordVotes = {};
  game.heads.turnScore = 0;
  game.heads.correctCount = 0;
  game.heads.passCount = 0;
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
    game.heads.words = shuffleArray(headsUpWords);
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

  clearHeadsUpTimers(game);

  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);

  io.to(pin).emit("heads_up_turn_result", {
    game: publicGame(game),
    playerName: activePlayer ? activePlayer.name : "Jugador",
    correctCount: game.heads.correctCount,
    passCount: game.heads.passCount,
    turnScore: game.heads.turnScore,
    ranking: getRanking(game)
  });

  game.heads.betweenTimer = setTimeout(() => {
    startNextHeadsUpTurn(pin);
  }, 5000);
}

function finishCompleteGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearHeadsUpTimers(game);

  game.status = "heads_finished";

  setTimeout(() => {
    startNextSelectedGame(pin);
  }, 1500);
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
    durationMs: 60000,
    endAt: null,
    gameTimer: null,
    open: false
  };

  io.to(pin).emit("word_connect_intro", {
    game: publicGame(game)
  });
}

function beginWordConnect(pin) {
  const game = games.get(pin);

  if (!game) return;

  const puzzle = wordConnectPuzzles[Math.floor(Math.random() * wordConnectPuzzles.length)];

  game.status = "word_connect";
  game.word.puzzle = {
    letters: puzzle.letters,
    validWords: puzzle.validWords.map(normalizeWord)
  };
  game.word.wordsByPlayer = {};
  game.word.endAt = Date.now() + game.word.durationMs;
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

  io.to(pin).emit("word_connect_finished", {
    game: publicGame(game),
    letters: game.word.puzzle.letters,
    validWords: game.word.puzzle.validWords,
    playerResults,
    ranking: getRanking(game)
  });

  setTimeout(() => {
    startNextSelectedGame(pin);
  }, 6000);
}

function finishFinalGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearTriviaTimers(game);
  clearFriendTimers(game);
  clearHeadsUpTimers(game);
  clearWordConnectTimers(game);

  game.status = "finished";

  io.to(pin).emit("game_finished", {
    game: publicGame(game),
    ranking: getRanking(game)
  });
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

  socket.on("create_game", ({ name }, callback) => {
    const pin = generatePin();

    const player = {
      id: socket.id,
      name: cleanName(name) || "Líder",
      score: 0
    };

    const game = {
      pin,
      leaderId: socket.id,
      status: "lobby",
      selectedTheme: null,
      selectedGames: [...DEFAULT_SELECTED_GAMES],
      currentGameIndex: -1,
      players: [player],
      themeVotes: {},
      trivia: null,
      friend: null,
      heads: null,
      word: null
    };

    games.set(pin, game);

    socket.join(pin);
    socket.data.pin = pin;

    callback({
      ok: true,
      game: publicGame(game)
    });

    io.to(pin).emit("game_updated", publicGame(game));
  });

  socket.on("join_game", ({ pin, name }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "Ese PIN no existe."
      });
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
      name: cleanName(name) || "Jugador",
      score: 0
    };

    const alreadyInside = game.players.some((p) => p.id === socket.id);

    if (!alreadyInside) {
      game.players.push(player);
    }

    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length);

    socket.join(cleanGamePin);
    socket.data.pin = cleanGamePin;

    callback({
      ok: true,
      game: publicGame(game)
    });

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
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

    game.selectedGames = sanitizeSelectedGames(selectedGames, game.players.length);

    callback({
      ok: true,
      selectedGames: game.selectedGames
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

    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length);

    if (!game.selectedGames.length) {
      callback({
        ok: false,
        message: "Selecciona al menos un juego."
      });
      return;
    }

    game.currentGameIndex = -1;

    callback({
      ok: true
    });

    startNextSelectedGame(cleanGamePin);
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

    const validTheme = THEMES.some((item) => item.id === theme);

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

    const allPlayersVoted = game.players.every((player) => game.themeVotes[player.id]);

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

    const questions = triviaQuestions[game.selectedTheme];
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

    const answeredPlayers = game.players.filter((item) => game.trivia.answers[item.id]);

    if (answeredPlayers.length >= game.players.length) {
      finishQuestion(cleanGamePin);
    }
  });

  socket.on("submit_friend_vote", ({ pin, targetPlayerId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "friend_trivia" || !game.friend) {
      callback({
        ok: false,
        message: "La trivia de amigos no está activa."
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
    const target = game.players.find((player) => player.id === targetPlayerId);

    if (!voter) {
      callback({
        ok: false,
        message: "No estás dentro de la partida."
      });
      return;
    }

    if (!target) {
      callback({
        ok: false,
        message: "Ese jugador no existe."
      });
      return;
    }

    if (target.id === socket.id) {
      callback({
        ok: false,
        message: "No puedes votar por ti mismo."
      });
      return;
    }

    game.friend.votes[socket.id] = target.id;

    callback({
      ok: true,
      message: "Voto recibido."
    });

    const votedPlayers = game.players.filter((player) => game.friend.votes[player.id]);

    if (votedPlayers.length >= game.players.length) {
      finishFriendQuestion(cleanGamePin);
    }
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
      const selectedTheme = theme || "deportes";

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
        themeName: getThemeName(selectedTheme),
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
        message: "Saltando a Trivia de amigos."
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
      game.status = "finished";

      callback({
        ok: true,
        message: "Saltando al ranking final."
      });

      io.to(cleanGamePin).emit("game_finished", {
        game: publicGame(game),
        ranking: getRanking(game)
      });

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

    game.players = game.players.filter((player) => player.id !== socket.id);

    if (game.players.length === 0) {
      clearTriviaTimers(game);
      clearFriendTimers(game);
      clearHeadsUpTimers(game);
      clearWordConnectTimers(game);
      games.delete(pin);
      return;
    }

    if (wasLeader) {
      game.leaderId = game.players[0].id;
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