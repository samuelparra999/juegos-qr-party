const socket = io();

let currentGame = null;
let isLeader = false;
let selectedTheme = null;
let timerInterval = null;

const THEMES = [
  { id: "deportes", name: "Deportes" },
  { id: "historia", name: "Historia" },
  { id: "cine", name: "Cine" },
  { id: "ciencia", name: "Ciencia" }
];

// Pantallas principales
const homeScreen = document.getElementById("homeScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const themeScreen = document.getElementById("themeScreen");
const triviaScreen = document.getElementById("triviaScreen");
const resultScreen = document.getElementById("resultScreen");
const friendScreen = document.getElementById("friendScreen");
const friendResultScreen = document.getElementById("friendResultScreen");
const headsIntroScreen = document.getElementById("headsIntroScreen");
const headsScreen = document.getElementById("headsScreen");
const headsResultScreen = document.getElementById("headsResultScreen");
const wordIntroScreen = document.getElementById("wordIntroScreen");
const wordScreen = document.getElementById("wordScreen");
const wordResultScreen = document.getElementById("wordResultScreen");
const finalScreen = document.getElementById("finalScreen");

// Inicio y lobby
const playerNameInput = document.getElementById("playerName");
const pinInput = document.getElementById("pinInput");

const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const startGameBtn = document.getElementById("startGameBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const returnHomeBtn = document.getElementById("returnHomeBtn");

const pinDisplay = document.getElementById("pinDisplay");
const roleText = document.getElementById("roleText");
const playersList = document.getElementById("playersList");
const waitingText = document.getElementById("waitingText");

const gameKnowledge = document.getElementById("gameKnowledge");
const gameFriend = document.getElementById("gameFriend");
const gameHeads = document.getElementById("gameHeads");
const gameWord = document.getElementById("gameWord");
const friendGameHelp = document.getElementById("friendGameHelp");

const gameCheckboxes = [gameKnowledge, gameFriend, gameHeads, gameWord];

// QR
const qrImage = document.getElementById("qrImage");
const qrUrl = document.getElementById("qrUrl");

// Votación de tema
const themeOptions = document.getElementById("themeOptions");
const themeVotesList = document.getElementById("themeVotesList");

// Trivia de conocimiento
const triviaThemeText = document.getElementById("triviaThemeText");
const questionCounter = document.getElementById("questionCounter");
const timerText = document.getElementById("timerText");
const timerFill = document.getElementById("timerFill");
const questionText = document.getElementById("questionText");
const optionsList = document.getElementById("optionsList");
const answerStatus = document.getElementById("answerStatus");

const correctAnswerText = document.getElementById("correctAnswerText");
const answersList = document.getElementById("answersList");
const roundRankingList = document.getElementById("roundRankingList");

// Trivia de amigos
const friendQuestionCounter = document.getElementById("friendQuestionCounter");
const friendTimerText = document.getElementById("friendTimerText");
const friendTimerFill = document.getElementById("friendTimerFill");
const friendQuestionText = document.getElementById("friendQuestionText");
const friendOptionsList = document.getElementById("friendOptionsList");
const friendAnswerStatus = document.getElementById("friendAnswerStatus");

const friendResultTitle = document.getElementById("friendResultTitle");
const friendAnswersList = document.getElementById("friendAnswersList");
const friendRankingList = document.getElementById("friendRankingList");

// Heads Up
const startHeadsUpBtn = document.getElementById("startHeadsUpBtn");
const headsIntroWaitingText = document.getElementById("headsIntroWaitingText");

const headsTurnCounter = document.getElementById("headsTurnCounter");
const headsTimerText = document.getElementById("headsTimerText");
const headsTimerFill = document.getElementById("headsTimerFill");
const headsTurnTitle = document.getElementById("headsTurnTitle");
const headsCategoryText = document.getElementById("headsCategoryText");
const headsWordText = document.getElementById("headsWordText");
const headsInstructionText = document.getElementById("headsInstructionText");
const headsControls = document.getElementById("headsControls");
const headsCorrectBtn = document.getElementById("headsCorrectBtn");
const headsPassBtn = document.getElementById("headsPassBtn");
const headsStatusText = document.getElementById("headsStatusText");

const headsResultTitle = document.getElementById("headsResultTitle");
const headsCorrectCount = document.getElementById("headsCorrectCount");
const headsPassCount = document.getElementById("headsPassCount");
const headsTurnScore = document.getElementById("headsTurnScore");
const headsRankingList = document.getElementById("headsRankingList");

// Word Connect
const startWordConnectBtn = document.getElementById("startWordConnectBtn");
const wordIntroWaitingText = document.getElementById("wordIntroWaitingText");

const wordTimerText = document.getElementById("wordTimerText");
const wordTimerFill = document.getElementById("wordTimerFill");
const wordLettersBox = document.getElementById("wordLettersBox");
const wordInput = document.getElementById("wordInput");
const submitWordBtn = document.getElementById("submitWordBtn");
const wordStatusText = document.getElementById("wordStatusText");
const foundWordsList = document.getElementById("foundWordsList");
const wordRankingList = document.getElementById("wordRankingList");

const validWordsText = document.getElementById("validWordsText");
const wordResultsList = document.getElementById("wordResultsList");
const wordFinalRankingList = document.getElementById("wordFinalRankingList");

// Resultado final
const finalRankingList = document.getElementById("finalRankingList");

// Toast
const toast = document.getElementById("toast");

loadQR();

function loadQR() {
  fetch("/qr")
    .then((res) => res.json())
    .then((data) => {
      qrImage.src = data.qr;
      qrUrl.textContent = data.url;
    })
    .catch(() => {
      qrUrl.textContent = "No se pudo cargar el QR.";
    });
}

function showScreen(screen) {
  homeScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  themeScreen.classList.add("hidden");
  triviaScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  friendScreen.classList.add("hidden");
  friendResultScreen.classList.add("hidden");
  headsIntroScreen.classList.add("hidden");
  headsScreen.classList.add("hidden");
  headsResultScreen.classList.add("hidden");
  wordIntroScreen.classList.add("hidden");
  wordScreen.classList.add("hidden");
  wordResultScreen.classList.add("hidden");
  finalScreen.classList.add("hidden");

  screen.classList.remove("hidden");
}

function getPlayerName() {
  return playerNameInput.value.trim() || "Jugador";
}

function cleanPinInput(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function getThemeName(themeId) {
  const theme = THEMES.find((item) => item.id === themeId);
  return theme ? theme.name : themeId;
}

// --------------------------------------------------
// Botones iniciales
// --------------------------------------------------

createGameBtn.addEventListener("click", () => {
  const name = getPlayerName();

  socket.emit("create_game", { name }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo crear la partida.");
      return;
    }

    currentGame = response.game;
    isLeader = true;

    renderLobby(response.game);
  });
});

joinGameBtn.addEventListener("click", () => {
  const name = getPlayerName();
  const pin = cleanPinInput(pinInput.value);

  if (pin.length !== 6) {
    showToast("Escribe un PIN de 6 números.");
    return;
  }

  socket.emit("join_game", { pin, name }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo unir a la partida.");
      return;
    }

    currentGame = response.game;
    isLeader = response.game.leaderId === socket.id;

    renderLobby(response.game);
  });
});

gameCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    updateSelectedGamesFromLobby();
  });
});

startGameBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo iniciar.");
    }
  });
});

copyLinkBtn.addEventListener("click", async () => {
  const link = `${window.location.origin}/juegos`;

  try {
    await navigator.clipboard.writeText(link);
    showToast("Enlace copiado.");
  } catch {
    showToast("No se pudo copiar el enlace.");
  }
});

returnHomeBtn.addEventListener("click", () => {
  window.location.reload();
});

  startHeadsUpBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_heads_up_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar Heads Up.");
    }
  });
});

startWordConnectBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_word_connect_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar Word Connect.");
    }
  });
});

submitWordBtn.addEventListener("click", () => {
  submitWordConnectWord();
});

wordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitWordConnectWord();
  }
});

// --------------------------------------------------
// Eventos del servidor
// --------------------------------------------------

socket.on("game_updated", (game) => {
  currentGame = game;
  isLeader = game.leaderId === socket.id;

  if (game.status === "lobby") {
    renderLobby(game);
  }
});

socket.on("theme_vote_started", (data) => {
  currentGame = data.game;
  selectedTheme = null;

  renderThemeScreen(data);
});

socket.on("theme_votes_updated", (data) => {
  renderThemeVotes(data.votes);
});

socket.on("theme_chosen", (data) => {
  currentGame = data.game;
  showToast(`Tema elegido: ${data.themeName}`);
});

socket.on("trivia_question", (data) => {
  currentGame = data.game;
  renderTriviaQuestion(data.question);
});

socket.on("trivia_question_result", (data) => {
  currentGame = data.game;
  renderQuestionResult(data);
});

socket.on("knowledge_trivia_finished", (data) => {
  currentGame = data.game;
  showToast("Trivia de conocimiento terminada. Ahora viene Trivia de amigos.");
});

socket.on("friend_trivia_started", (data) => {
  currentGame = data.game;
  showToast("Empieza Trivia de amigos.");
});

socket.on("friend_question", (data) => {
  currentGame = data.game;
  renderFriendQuestion(data.question);
});

socket.on("friend_question_result", (data) => {
  currentGame = data.game;
  renderFriendQuestionResult(data);
});

socket.on("heads_up_intro", (data) => {
  currentGame = data.game;
  renderHeadsUpIntro(data.game);
});

socket.on("heads_up_started", (data) => {
  currentGame = data.game;
  showToast("Empieza Heads Up.");
});

socket.on("heads_up_turn_started", (data) => {
  currentGame = data.game;
  showToast(`Turno de ${data.playerName}`);
});

socket.on("heads_up_word", (data) => {
  currentGame = data.game;
  renderHeadsUpWord(data.turn);
});

socket.on("heads_up_votes_updated", (data) => {
  headsStatusText.textContent = `Votos correcto: ${data.correctVotes}/${data.majorityNeeded}`;
});

socket.on("heads_up_word_result", (data) => {
  currentGame = data.game;
  renderHeadsUpWordResult(data);
});

socket.on("heads_up_turn_result", (data) => {
  currentGame = data.game;
  renderHeadsUpTurnResult(data);
});

socket.on("word_connect_intro", (data) => {
  currentGame = data.game;
  renderWordConnectIntro(data.game);
});

socket.on("word_connect_started", (data) => {
  currentGame = data.game;
  renderWordConnectGame(data.wordState);
});

socket.on("word_connect_ranking_updated", (data) => {
  renderRankingList(wordRankingList, data.ranking);
});

socket.on("word_connect_finished", (data) => {
  currentGame = data.game;
  renderWordConnectResult(data);
});

socket.on("game_finished", (data) => {
  currentGame = data.game;
  renderFinalRanking(data.ranking);
});

// --------------------------------------------------
// Lobby
// --------------------------------------------------

function getSelectedGamesFromLobby() {
  const selectedGames = [];

  if (gameKnowledge.checked) selectedGames.push("knowledge");

  if (gameFriend.checked && !gameFriend.disabled) {
    selectedGames.push("friend");
  }

  if (gameHeads.checked) selectedGames.push("heads");
  if (gameWord.checked) selectedGames.push("word");

  return selectedGames;
}

function updateSelectedGamesFromLobby() {
  if (!currentGame || !isLeader) return;

  const selectedGames = getSelectedGamesFromLobby();

  socket.emit("update_selected_games", {
    pin: currentGame.pin,
    selectedGames
  }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudieron actualizar los juegos.");
    }
  });
}

function renderGameSelection(game) {
  const selectedGames = game.selectedGames || ["knowledge", "heads", "word"];
  const playerCount = game.players.length;
  const friendUnlocked = playerCount >= 3;

  gameKnowledge.checked = selectedGames.includes("knowledge");
  gameHeads.checked = selectedGames.includes("heads");
  gameWord.checked = selectedGames.includes("word");

  gameFriend.checked = friendUnlocked && selectedGames.includes("friend");

  gameKnowledge.disabled = !isLeader;
  gameHeads.disabled = !isLeader;
  gameWord.disabled = !isLeader;

  gameFriend.disabled = !isLeader || !friendUnlocked;

  if (friendUnlocked) {
    friendGameHelp.textContent = "Disponible.";
  } else {
    friendGameHelp.textContent = `Se desbloquea con 3 jugadores. Conectados: ${playerCount}/3.`;
  }
}

function renderLobby(game) {
  pinDisplay.textContent = game.pin;

  roleText.textContent = isLeader
    ? "Eres el líder de la partida."
    : "Estás dentro de la partida.";

  playersList.innerHTML = "";

  game.players.forEach((player) => {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = player.name;

    li.appendChild(nameSpan);

    if (player.isLeader) {
      const leaderTag = document.createElement("span");
      leaderTag.className = "leader-tag";
      leaderTag.textContent = "Líder";
      li.appendChild(leaderTag);
    }

    playersList.appendChild(li);
  });

  if (isLeader) {
    startGameBtn.classList.remove("hidden");
    waitingText.classList.add("hidden");
  } else {
    startGameBtn.classList.add("hidden");
    waitingText.classList.remove("hidden");
  }

  renderGameSelection(game);  

  showScreen(lobbyScreen);
}

// --------------------------------------------------
// Votación de tema
// --------------------------------------------------

function renderThemeScreen(data) {
  const themes = data.themes || THEMES;

  themeOptions.innerHTML = "";

  themes.forEach((theme) => {
    const button = document.createElement("button");
    button.className = "theme-btn";
    button.textContent = theme.name;

    button.addEventListener("click", () => {
      submitThemeVote(theme.id);
    });

    themeOptions.appendChild(button);
  });

  renderThemeVotes(data.votes || {});
  showScreen(themeScreen);
}

function submitThemeVote(themeId) {
  if (!currentGame) return;

  selectedTheme = themeId;

  const buttons = document.querySelectorAll(".theme-btn");

  buttons.forEach((button) => {
    button.disabled = true;

    if (button.textContent === getThemeName(themeId)) {
      button.classList.add("selected");
    }
  });

  socket.emit("submit_theme_vote", { pin: currentGame.pin, theme: themeId }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo votar.");

      buttons.forEach((button) => {
        button.disabled = false;
      });

      return;
    }

    showToast("Voto enviado.");
  });
}

function renderThemeVotes(votes) {
  themeVotesList.innerHTML = "";

  THEMES.forEach((theme) => {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = theme.name;

    const votesSpan = document.createElement("strong");
    votesSpan.textContent = votes[theme.id] || 0;

    li.appendChild(nameSpan);
    li.appendChild(votesSpan);

    themeVotesList.appendChild(li);
  });
}

// --------------------------------------------------
// Trivia de conocimiento
// --------------------------------------------------

function renderTriviaQuestion(question) {
  clearInterval(timerInterval);

  triviaThemeText.textContent = `Trivia de ${question.themeName}`;
  questionCounter.textContent = `Pregunta ${question.number}/${question.total}`;
  questionText.textContent = question.question;
  answerStatus.textContent = "";

  optionsList.innerHTML = "";

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.textContent = option.text;

    button.addEventListener("click", () => {
      submitAnswer(option.index, button);
    });

    optionsList.appendChild(button);
  });

  startTimer(question.endAt, question.durationMs);
  showScreen(triviaScreen);
}

function startTimer(endAt, durationMs) {
  function updateTimer() {
    const remaining = Math.max(0, endAt - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const percent = Math.max(0, Math.min(100, (remaining / durationMs) * 100));

    timerText.textContent = `${seconds}s`;
    timerFill.style.width = `${percent}%`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      disableOptionButtons();
      answerStatus.textContent = "Tiempo terminado.";
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 100);
}

function submitAnswer(optionIndex, selectedButton) {
  if (!currentGame) return;

  selectedButton.classList.add("selected");
  disableOptionButtons();

  answerStatus.textContent = "Respuesta enviada. Esperando resultados...";

  socket.emit("submit_answer", { pin: currentGame.pin, optionIndex }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo enviar la respuesta.");
    }
  });
}

function disableOptionButtons() {
  const buttons = document.querySelectorAll(".option-btn");

  buttons.forEach((button) => {
    button.disabled = true;
  });
}

function renderQuestionResult(data) {
  clearInterval(timerInterval);

  correctAnswerText.textContent = `Respuesta correcta: ${data.correctText}`;

  answersList.innerHTML = "";

  data.answers.forEach((answer) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${answer.playerName}</strong><br>
      Respondió: ${answer.selectedText}<br>
      Puntos ganados: ${answer.points}<br>
      <span class="${answer.correct ? "correct-pill" : "wrong-pill"}">
        ${answer.correct ? "Correcta" : "Incorrecta"}
      </span>
    `;

    answersList.appendChild(li);
  });

  renderRankingList(roundRankingList, data.ranking);

  showScreen(resultScreen);
}

// --------------------------------------------------
// Trivia de amigos
// --------------------------------------------------

function renderFriendQuestion(question) {
  clearInterval(timerInterval);

  friendQuestionCounter.textContent = `Pregunta ${question.number}/${question.total}`;
  friendQuestionText.textContent = question.question;
  friendAnswerStatus.textContent = "";

  friendOptionsList.innerHTML = "";

  const otherPlayers = question.players.filter((player) => player.id !== socket.id);

  otherPlayers.forEach((player) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.textContent = player.name;

    button.addEventListener("click", () => {
      submitFriendVote(player.id, button);
    });

    friendOptionsList.appendChild(button);
  });

  startFriendTimer(question.endAt, question.durationMs);
  showScreen(friendScreen);
}

function startFriendTimer(endAt, durationMs) {
  function updateTimer() {
    const remaining = Math.max(0, endAt - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const percent = Math.max(0, Math.min(100, (remaining / durationMs) * 100));

    friendTimerText.textContent = `${seconds}s`;
    friendTimerFill.style.width = `${percent}%`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      disableFriendButtons();
      friendAnswerStatus.textContent = "Tiempo terminado.";
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 100);
}

function submitFriendVote(targetPlayerId, selectedButton) {
  if (!currentGame) return;

  selectedButton.classList.add("selected");
  disableFriendButtons();

  friendAnswerStatus.textContent = "Voto enviado. Esperando resultados...";

  socket.emit("submit_friend_vote", { pin: currentGame.pin, targetPlayerId }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo enviar el voto.");
    }
  });
}

function disableFriendButtons() {
  const buttons = document.querySelectorAll("#friendOptionsList .option-btn");

  buttons.forEach((button) => {
    button.disabled = true;
  });
}

function renderFriendQuestionResult(data) {
  clearInterval(timerInterval);

  const winners = data.winnerNames.length > 0
    ? data.winnerNames.join(", ")
    : "Nadie";

  friendResultTitle.textContent = `Mayoría: ${winners}`;

  friendAnswersList.innerHTML = "";

  data.answers.forEach((answer) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${answer.playerName}</strong><br>
      Votó por: ${answer.votedForName}<br>
      Puntos ganados: ${answer.points}<br>
      <span class="${answer.votedWinner ? "correct-pill" : "wrong-pill"}">
        ${answer.votedWinner ? "Votó con la mayoría" : "No votó con la mayoría"}
      </span>
    `;

    friendAnswersList.appendChild(li);
  });

  renderRankingList(friendRankingList, data.ranking);

  showScreen(friendResultScreen);
}

// --------------------------------------------------
// Heads Up nuevo
// --------------------------------------------------

function renderHeadsUpIntro(game) {
  currentGame = game;
  isLeader = game.leaderId === socket.id;

  if (isLeader) {
    startHeadsUpBtn.classList.remove("hidden");
    headsIntroWaitingText.classList.add("hidden");
  } else {
    startHeadsUpBtn.classList.add("hidden");
    headsIntroWaitingText.classList.remove("hidden");
  }

  showScreen(headsIntroScreen);
}

function renderHeadsUpWord(turn) {
  clearInterval(timerInterval);

  headsTurnCounter.textContent = `Turno ${turn.turnNumber}/${turn.totalTurns}`;
  headsTurnTitle.textContent = `Turno de ${turn.playerName}`;
  headsCategoryText.textContent = turn.category;
  headsWordText.textContent = turn.wordText;
  headsStatusText.textContent = "";

  headsCorrectBtn.classList.add("hidden");
  headsPassBtn.classList.add("hidden");
  headsControls.classList.add("hidden");

  headsCorrectBtn.disabled = false;
  headsPassBtn.disabled = false;

  if (turn.canPass) {
    headsInstructionText.textContent =
      `Te toca adivinar. Escucha las pistas. Si no sabes la respuesta, toca "Pasar".`;

    headsPassBtn.classList.remove("hidden");
    headsControls.classList.remove("hidden");
  }

  if (turn.canVoteCorrect) {
    headsInstructionText.textContent =
      `Dale pistas a ${turn.playerName}. Si adivina la palabra, toca "Correcto".`;

    headsCorrectBtn.classList.remove("hidden");
    headsControls.classList.remove("hidden");

    headsStatusText.textContent =
      `Votos correcto: ${turn.correctVotes}/${turn.majorityNeeded}`;

    if (turn.hasVotedCorrect) {
      headsCorrectBtn.disabled = true;
      headsStatusText.textContent =
        `Ya votaste. Votos correcto: ${turn.correctVotes}/${turn.majorityNeeded}`;
    }
  }

  headsCorrectBtn.onclick = () => {
    submitHeadsUpAction("correct_vote");
  };

  headsPassBtn.onclick = () => {
    submitHeadsUpAction("pass");
  };

  startHeadsTimer(turn.endAt, turn.durationMs);
  showScreen(headsScreen);
}

function startHeadsTimer(endAt, durationMs) {
  function updateTimer() {
    const remaining = Math.max(0, endAt - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const percent = Math.max(0, Math.min(100, (remaining / durationMs) * 100));

    headsTimerText.textContent = `${seconds}s`;
    headsTimerFill.style.width = `${percent}%`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      headsCorrectBtn.disabled = true;
      headsPassBtn.disabled = true;
      headsStatusText.textContent = "Tiempo terminado.";
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 100);
}

function submitHeadsUpAction(action) {
  if (!currentGame) return;

  if (action === "correct_vote") {
    headsCorrectBtn.disabled = true;
    headsStatusText.textContent = "Voto enviado. Esperando mayoría...";
  }

  if (action === "pass") {
    headsPassBtn.disabled = true;
    headsStatusText.textContent = "Pasando palabra...";
  }

  socket.emit("submit_heads_up_action", { pin: currentGame.pin, action }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo enviar la acción.");

      if (action === "correct_vote") {
        headsCorrectBtn.disabled = false;
      }

      if (action === "pass") {
        headsPassBtn.disabled = false;
      }

      return;
    }

    if (action === "correct_vote") {
      headsStatusText.textContent =
        `Voto enviado. Votos correcto: ${response.correctVotes}/${response.majorityNeeded}`;
    }
  });
}

function renderHeadsUpWordResult(data) {
  clearInterval(timerInterval);

  headsCategoryText.textContent = data.category;

  if (data.result === "correct") {
    headsWordText.textContent = `Correcto: ${data.revealedWord}`;
    headsInstructionText.textContent = "La mayoría votó correcto. Siguiente palabra...";
    headsStatusText.textContent = `Votos: ${data.correctVotes}/${data.majorityNeeded}`;
  }

  if (data.result === "passed") {
    headsWordText.textContent = `Pasaste: ${data.revealedWord}`;
    headsInstructionText.textContent = "La palabra fue saltada. Siguiente palabra...";
    headsStatusText.textContent = "";
  }

  headsCorrectBtn.disabled = true;
  headsPassBtn.disabled = true;
  headsControls.classList.add("hidden");

  showScreen(headsScreen);
}

function renderHeadsUpTurnResult(data) {
  clearInterval(timerInterval);

  headsResultTitle.textContent = `Turno terminado: ${data.playerName}`;
  headsCorrectCount.textContent = data.correctCount;
  headsPassCount.textContent = data.passCount;
  headsTurnScore.textContent = `${data.turnScore} pts`;

  renderRankingList(headsRankingList, data.ranking);

  showScreen(headsResultScreen);
}

function renderWordConnectIntro(game) {
  currentGame = game;
  isLeader = game.leaderId === socket.id;

  if (isLeader) {
    startWordConnectBtn.classList.remove("hidden");
    wordIntroWaitingText.classList.add("hidden");
  } else {
    startWordConnectBtn.classList.add("hidden");
    wordIntroWaitingText.classList.remove("hidden");
  }

  showScreen(wordIntroScreen);
}

function renderWordConnectGame(wordState) {
  clearInterval(timerInterval);

  wordLettersBox.innerHTML = "";
  foundWordsList.innerHTML = "";
  wordStatusText.textContent = "";
  wordInput.value = "";

  wordState.letters.forEach((letter) => {
    const div = document.createElement("div");
    div.className = "word-letter";
    div.textContent = letter;
    wordLettersBox.appendChild(div);
  });

  renderFoundWords(wordState.foundWords || []);
  renderRankingList(wordRankingList, wordState.ranking || []);

  submitWordBtn.disabled = false;
  wordInput.disabled = false;

  startWordTimer(wordState.endAt, wordState.durationMs);

  showScreen(wordScreen);

  setTimeout(() => {
    wordInput.focus();
  }, 300);
}

function startWordTimer(endAt, durationMs) {
  function updateTimer() {
    const remaining = Math.max(0, endAt - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const percent = Math.max(0, Math.min(100, (remaining / durationMs) * 100));

    wordTimerText.textContent = `${seconds}s`;
    wordTimerFill.style.width = `${percent}%`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      submitWordBtn.disabled = true;
      wordInput.disabled = true;
      wordStatusText.textContent = "Tiempo terminado.";
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 100);
}

function submitWordConnectWord() {
  if (!currentGame) return;

  const word = wordInput.value.trim();

  if (!word) {
    showToast("Escribe una palabra.");
    return;
  }

  submitWordBtn.disabled = true;

  socket.emit("submit_word_connect_word", { pin: currentGame.pin, word }, (response) => {
    submitWordBtn.disabled = false;

    if (!response.ok) {
      wordStatusText.textContent = response.message || "Palabra inválida.";
      wordInput.select();
      return;
    }

    wordStatusText.textContent = `+${response.word.points} pts por ${response.word.word}`;
    wordInput.value = "";

    renderFoundWords(response.foundWords || []);
    renderRankingList(wordRankingList, response.ranking || []);

    wordInput.focus();
  });
}

function renderFoundWords(words) {
  foundWordsList.innerHTML = "";

  if (!words.length) {
    const li = document.createElement("li");
    li.textContent = "Todavía no has encontrado palabras.";
    foundWordsList.appendChild(li);
    return;
  }

  words.forEach((item) => {
    const li = document.createElement("li");
    li.className = "word-chip";

    const wordSpan = document.createElement("span");
    wordSpan.textContent = item.word;

    const pointsSpan = document.createElement("strong");
    pointsSpan.textContent = `${item.points} pts`;

    li.appendChild(wordSpan);
    li.appendChild(pointsSpan);

    foundWordsList.appendChild(li);
  });
}

function renderWordConnectResult(data) {
  clearInterval(timerInterval);

  validWordsText.textContent = data.validWords.join(", ");

  wordResultsList.innerHTML = "";

  data.playerResults.forEach((result) => {
    const li = document.createElement("li");

    const wordsText = result.words.length
      ? result.words.map((item) => item.word).join(", ")
      : "Ninguna";

    li.innerHTML = `
      <strong>${result.playerName}</strong><br>
      Palabras encontradas: ${result.wordCount}<br>
      Puntos en Word Connect: ${result.points}<br>
      Palabras: ${wordsText}
    `;

    wordResultsList.appendChild(li);
  });

  renderRankingList(wordFinalRankingList, data.ranking);

  showScreen(wordResultScreen);
}

// --------------------------------------------------
// Ranking final
// --------------------------------------------------

function renderFinalRanking(ranking) {
  clearInterval(timerInterval);

  renderRankingList(finalRankingList, ranking);

  showScreen(finalScreen);
}

function renderRankingList(listElement, ranking) {
  listElement.innerHTML = "";

  ranking.forEach((player) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = `${player.position}. ${player.name}`;

    const score = document.createElement("strong");
    score.textContent = `${player.score} pts`;

    li.appendChild(name);
    li.appendChild(score);

    listElement.appendChild(li);
  });
}

window.devSkipTo = function (target, theme = "deportes") {
  if (!currentGame) {
    console.log("No hay una partida activa.");
    return;
  }

  socket.emit("dev_skip_to", {
    pin: currentGame.pin,
    target,
    theme
  }, (response) => {
    console.log(response);

    if (!response.ok) {
      showToast(response.message || "No se pudo saltar de fase.");
      return;
    }

    showToast(response.message || "Modo desarrollo activado.");
  });
};