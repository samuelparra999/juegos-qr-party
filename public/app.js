const socket = io();

let currentGame = null;
let isLeader = false;
let selectedTheme = null;
let timerInterval = null;
let directJoinPin = null;
let currentCampaign = null;
let currentCampaignSlug = "demo";
let pokerActionTimerInterval = null;

const THEMES = [
  { id: "deportes", name: "Deportes" },
  { id: "historia", name: "Historia" },
  { id: "cine", name: "Cine" },
  { id: "ciencia", name: "Ciencia" }
];

// Pantallas principales
const homeScreen = document.getElementById("homeScreen");
const directJoinScreen = document.getElementById("directJoinScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const themeScreen = document.getElementById("themeScreen");
const triviaScreen = document.getElementById("triviaScreen");
const resultScreen = document.getElementById("resultScreen");
const friendIntroScreen = document.getElementById("friendIntroScreen");
const friendCancelledScreen = document.getElementById("friendCancelledScreen");
const friendScreen = document.getElementById("friendScreen");
const friendResultScreen = document.getElementById("friendResultScreen");
const headsIntroScreen = document.getElementById("headsIntroScreen");
const headsScreen = document.getElementById("headsScreen");
const headsResultScreen = document.getElementById("headsResultScreen");
const wordIntroScreen = document.getElementById("wordIntroScreen");
const wordScreen = document.getElementById("wordScreen");
const wordResultScreen = document.getElementById("wordResultScreen");
const pokerIntroScreen = document.getElementById("pokerIntroScreen");
const pokerRankingsScreen = document.getElementById("pokerRankingsScreen");
const pokerScreen = document.getElementById("pokerScreen");
const cancelScreen = document.getElementById("cancelScreen");
const finalScreen = document.getElementById("finalScreen");

// Inicio y lobby
const playerNameInput = document.getElementById("playerName");
const pinInput = document.getElementById("pinInput");
const directJoinPinDisplay = document.getElementById("directJoinPinDisplay");
const directPlayerNameInput = document.getElementById("directPlayerName");
const directJoinNameError = document.getElementById("directJoinNameError");
const directJoinBtn = document.getElementById("directJoinBtn");

const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const playerNameError = document.getElementById("playerNameError");
const startGameBtn = document.getElementById("startGameBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const returnHomeBtn = document.getElementById("returnHomeBtn");
const cancelHomeBtn = document.getElementById("cancelHomeBtn");

const pinDisplay = document.getElementById("pinDisplay");
const roleText = document.getElementById("roleText");
const playersList = document.getElementById("playersList");
const waitingText = document.getElementById("waitingText");

const gameKnowledge = document.getElementById("gameKnowledge");
const gameSelectionBox = document.getElementById("gameSelectionBox");
const gameFriend = document.getElementById("gameFriend");
const gameHeads = document.getElementById("gameHeads");
const gameWord = document.getElementById("gameWord");
const friendGameHelp = document.getElementById("friendGameHelp");
const gamePoker = document.getElementById("gamePoker");

const gameCheckboxes = [gameKnowledge, gameFriend, gameHeads, gameWord, gamePoker].filter(Boolean);
// QR
const qrImage = document.getElementById("qrImage");
const qrUrl = document.getElementById("qrUrl");

const lobbyQrImage = document.getElementById("lobbyQrImage");
const lobbyQrUrl = document.getElementById("lobbyQrUrl");

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
const startFriendTriviaBtn = document.getElementById("startFriendTriviaBtn");
const friendIntroWaitingText = document.getElementById("friendIntroWaitingText");
const friendCancelledText = document.getElementById("friendCancelledText");
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

// Poker
const pokerLeaderSettings = document.getElementById("pokerLeaderSettings");
const pokerPlayerWaiting = document.getElementById("pokerPlayerWaiting");
const pokerSmallBlindInput = document.getElementById("pokerSmallBlindInput");
const pokerSummaryInitialChips = document.getElementById("pokerSummaryInitialChips");
const pokerSummarySmallBlind = document.getElementById("pokerSummarySmallBlind");
const pokerSummaryBigBlind = document.getElementById("pokerSummaryBigBlind");
const pokerSummaryRounds = document.getElementById("pokerSummaryRounds");
const pokerRoundsInput = document.getElementById("pokerRoundsInput");
const pokerSettingsHelp = document.getElementById("pokerSettingsHelp");
const savePokerSettingsBtn = document.getElementById("savePokerSettingsBtn");
const startPokerBtn = document.getElementById("startPokerBtn");

const pokerRankingsList = document.getElementById("pokerRankingsList");
const pokerRankingsLeaderControls = document.getElementById("pokerRankingsLeaderControls");
const continuePokerAfterRankingsBtn = document.getElementById("continuePokerAfterRankingsBtn");
const pokerRankingsWaiting = document.getElementById("pokerRankingsWaiting");

const pokerRoundText = document.getElementById("pokerRoundText");
const pokerBlindText = document.getElementById("pokerBlindText");
const pokerPlayersRing = document.getElementById("pokerPlayersRing");
const pokerCommunityCards = document.getElementById("pokerCommunityCards");
const pokerPlayerCards = document.getElementById("pokerPlayerCards");
const pokerStatusText = document.getElementById("pokerStatusText");
const pokerCurrentTurnText = document.getElementById("pokerCurrentTurnText");
const pokerActionTimerText = document.getElementById("pokerActionTimerText");
const pokerLeaderControls = document.getElementById("pokerLeaderControls");
const nextPokerHandBtn = document.getElementById("nextPokerHandBtn");
const finishPokerGameBtn = document.getElementById("finishPokerGameBtn");
const pokerShowdownList = document.getElementById("pokerShowdownList");

const pokerActionPanel = document.getElementById("pokerActionPanel");
const pokerTurnText = document.getElementById("pokerTurnText");
const pokerCheckBtn = document.getElementById("pokerCheckBtn");
const pokerCallBtn = document.getElementById("pokerCallBtn");
const pokerFoldBtn = document.getElementById("pokerFoldBtn");
const pokerBetAmountInput = document.getElementById("pokerBetAmountInput");
const pokerBetBtn = document.getElementById("pokerBetBtn");
const pokerRaiseBtn = document.getElementById("pokerRaiseBtn");
const pokerActionHelp = document.getElementById("pokerActionHelp");

// Resultado final
const finalRankingList = document.getElementById("finalRankingList");

// Toast
const toast = document.getElementById("toast");

const appTitle = document.getElementById("appTitle");
const directAppTitle = document.getElementById("directAppTitle");
const welcomeText = document.getElementById("welcomeText");

const campaignLogo = document.getElementById("campaignLogo");
const directCampaignLogo = document.getElementById("directCampaignLogo");

initApp();

async function initApp() {
  currentCampaignSlug = getCampaignSlugFromUrl();

  await loadCampaignConfig(currentCampaignSlug);

  loadQR();
  loadPinFromUrl();
}

function loadPinFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const pinFromUrl = cleanPinInput(params.get("pin"));

  if (!pinFromUrl || pinFromUrl.length !== 6) {
    return;
  }

  directJoinPin = pinFromUrl;
  directJoinPinDisplay.textContent = pinFromUrl;

  showScreen(directJoinScreen);

  setTimeout(() => {
    directPlayerNameInput.focus();
  }, 100);
}

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

function loadLobbyQR(pin) {
  if (!pin || !lobbyQrImage || !lobbyQrUrl) return;

  fetch(`/qr/${pin}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.ok) {
        lobbyQrUrl.textContent = "No se pudo cargar el QR de la partida.";
        return;
      }

      lobbyQrImage.src = data.qr;
      lobbyQrUrl.textContent = data.url;
    })
    .catch(() => {
      lobbyQrUrl.textContent = "No se pudo cargar el QR de la partida.";
    });
}

function showScreen(screen) {
  if (screen !== pokerScreen && pokerActionTimerInterval) {
    clearInterval(pokerActionTimerInterval);
    pokerActionTimerInterval = null;
  }

  homeScreen.classList.add("hidden");
  directJoinScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  themeScreen.classList.add("hidden");
  triviaScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  friendScreen.classList.add("hidden");
  friendResultScreen.classList.add("hidden");
  friendIntroScreen.classList.add("hidden");
  friendCancelledScreen.classList.add("hidden");
  headsIntroScreen.classList.add("hidden");
  headsScreen.classList.add("hidden");
  headsResultScreen.classList.add("hidden");
  wordIntroScreen.classList.add("hidden");
  wordScreen.classList.add("hidden");
  wordResultScreen.classList.add("hidden");
  pokerIntroScreen.classList.add("hidden");
  pokerRankingsScreen.classList.add("hidden");
  pokerScreen.classList.add("hidden");
  cancelScreen.classList.add("hidden");
  finalScreen.classList.add("hidden");

  screen.classList.remove("hidden");
}

function getPlayerName() {
  return playerNameInput.value.trim();
}

function cleanPinInput(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

function getCampaignSlugFromUrl() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);

  if ((pathParts[0] === "jugar" || pathParts[0] === "juegos") && pathParts[1]) {
    return pathParts[1];
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("campaign") || "demo";
}

function showPlayerNameError() {
  playerNameError.classList.remove("hidden");
  playerNameInput.classList.add("input-invalid");
  playerNameInput.setAttribute("aria-invalid", "true");
}

function hidePlayerNameError() {
  playerNameError.classList.add("hidden");
  playerNameInput.classList.remove("input-invalid");
  playerNameInput.removeAttribute("aria-invalid");
}

playerNameInput.addEventListener("input", () => {
  if (playerNameInput.value.trim()) {
    hidePlayerNameError();
  }
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("navigator.clipboard falló:", error);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;

    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");

    document.body.removeChild(textarea);

    return copied;
  } catch (error) {
    console.warn("Copia alternativa falló:", error);
    return false;
  }
}

function applyCampaignVisuals(campaign) {
  if (!campaign || !campaign.visual) return;

  const visual = campaign.visual;
  const root = document.documentElement;

  if (visual.logoUrl) {
    if (campaignLogo) {
      campaignLogo.src = visual.logoUrl;
      campaignLogo.classList.remove("hidden");
    }

    if (directCampaignLogo) {
      directCampaignLogo.src = visual.logoUrl;
      directCampaignLogo.classList.remove("hidden");
    }
  } else {
    if (campaignLogo) {
      campaignLogo.classList.add("hidden");
    }

    if (directCampaignLogo) {
      directCampaignLogo.classList.add("hidden");
    }
  }

  root.style.setProperty("--color-primary", visual.primaryColor || "#74ff7a");
  root.style.setProperty("--color-secondary", visual.secondaryColor || "#ffffff");
  root.style.setProperty("--color-tertiary", visual.tertiaryColor || "#ffd45c");
  root.style.setProperty("--text-color", visual.textColor || "#ffffff");
  root.style.setProperty("--muted-text-color", visual.mutedTextColor || "#d8def8");
  root.style.setProperty("--card-background", visual.cardBackground || "rgba(255, 255, 255, 0.1)");

  if (visual.backgroundType === "image" && visual.backgroundImageUrl) {
    document.body.style.background = `url("${visual.backgroundImageUrl}") center/cover fixed`;
  } else if (visual.backgroundGradient) {
    document.body.style.background = visual.backgroundGradient;
  } else {
    document.body.style.background = visual.backgroundColor || "#101322";
  }
}

function applyCampaignTexts(campaign) {
  if (!campaign) return;

  document.title = campaign.name || "Juegos QR Party";

  if (appTitle) {
    appTitle.textContent = campaign.name || "Juegos QR Party";
  }

  if (directAppTitle) {
    directAppTitle.textContent = campaign.name || "Juegos QR Party";
  }

  if (welcomeText) {
    welcomeText.textContent =
      campaign.welcomeText || "Crea una partida, comparte el QR y juega con tu grupo.";
  }
}

function applyCampaignGameAvailability(campaign) {
  if (!campaign || !campaign.games || !campaign.games.available) return;

  const available = campaign.games.available;

  if (gameKnowledge && gameKnowledge.closest(".game-option")) {
    gameKnowledge.closest(".game-option").classList.toggle("hidden", !available.knowledge);
  }

  if (gameFriend && gameFriend.closest(".game-option")) {
    gameFriend.closest(".game-option").classList.toggle("hidden", !available.friend);
  }

  if (gameHeads && gameHeads.closest(".game-option")) {
    gameHeads.closest(".game-option").classList.toggle("hidden", !available.heads);
  }

  if (gameWord && gameWord.closest(".game-option")) {
    gameWord.closest(".game-option").classList.toggle("hidden", !available.word);
  }

  if (gamePoker && gamePoker.closest(".game-option")) {
    gamePoker.closest(".game-option").classList.toggle("hidden", !available.poker);
  }
}

async function loadCampaignConfig(campaignSlug) {
  try {
    const response = await fetch(`/api/campaign/${campaignSlug}`);
    const data = await response.json();

    if (!data.ok) {
      showToast("No se pudo cargar la campaña.");
      return;
    }

    currentCampaign = data.campaign;
    currentCampaignSlug = data.campaign.slug;

    applyCampaignVisuals(currentCampaign);
    applyCampaignTexts(currentCampaign);
    applyCampaignGameAvailability(currentCampaign);
  } catch (error) {
    console.error(error);
    showToast("No se pudo cargar la campaña.");
  }
}

function getCurrentThemes() {
  return currentCampaign?.knowledgeTrivia?.themes?.length
    ? currentCampaign.knowledgeTrivia.themes
    : THEMES;
}

function getThemeName(themeId) {
  const theme = getCurrentThemes().find((item) => item.id === themeId);
  return theme ? theme.name : themeId;
}

function showDirectJoinNameError() {
  directJoinNameError.classList.remove("hidden");
  directPlayerNameInput.classList.add("input-invalid");
  directPlayerNameInput.setAttribute("aria-invalid", "true");
}

function hideDirectJoinNameError() {
  directJoinNameError.classList.add("hidden");
  directPlayerNameInput.classList.remove("input-invalid");
  directPlayerNameInput.removeAttribute("aria-invalid");
}

directPlayerNameInput.addEventListener("input", () => {
  if (directPlayerNameInput.value.trim()) {
    hideDirectJoinNameError();
  }
});

// --------------------------------------------------
// Botones iniciales
// --------------------------------------------------

createGameBtn.addEventListener("click", () => {
  const name = getPlayerName() || "Jugador";

  socket.emit("create_game", { name, campaignSlug: currentCampaignSlug }, (response) => {
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

  if (!name) {
    showPlayerNameError();
    playerNameInput.focus();
    return;
  }

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

directJoinBtn.addEventListener("click", () => {
  const name = directPlayerNameInput.value.trim();

  if (!directJoinPin) {
    showToast("No se encontró el código de la partida.");
    return;
  }

  if (!name) {
    showDirectJoinNameError();
    directPlayerNameInput.focus();
    return;
  }

  socket.emit("join_game", { pin: directJoinPin, name }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo unir a la partida.");
      return;
    }

    currentGame = response.game;
    isLeader = response.game.leaderId === socket.id;

    renderLobby(response.game);
  });
});

directPlayerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    directJoinBtn.click();
  }
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
  if (!currentGame) return;

  const campaignSlug = currentGame.campaignSlug || currentCampaignSlug || "demo";
  const link = `${window.location.origin}/juegos/${campaignSlug}?pin=${currentGame.pin}`;

  const copied = await copyTextToClipboard(link);

  if (copied) {
    showToast("Enlace de la partida copiado.");
    return;
  }

  window.prompt("No se pudo copiar automáticamente. Copia este enlace:", link);
});

returnHomeBtn.addEventListener("click", () => {
  window.location.reload();
});

cancelHomeBtn.addEventListener("click", () => {
  window.location.reload();
});

startFriendTriviaBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_friend_trivia_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar Trivia de amigos.");
    }
  });
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

savePokerSettingsBtn.addEventListener("click", () => {
  if (!currentGame) return;

  const settings = {
    smallBlind: Number(pokerSmallBlindInput.value),
    totalRounds: Number(pokerRoundsInput.value)
  };

  socket.emit("update_poker_settings", {
    pin: currentGame.pin,
    settings
  }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo guardar la configuración de Poker.");
      return;
    }

    showToast("Configuración de Poker guardada.");
  });
});

startPokerBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_poker_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar Poker.");
    }
  });
});

continuePokerAfterRankingsBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("continue_poker_after_rankings", {
    pin: currentGame.pin
  }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo continuar.");
    }
  });
});

nextPokerHandBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("next_poker_hand", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo iniciar la siguiente mano.");
    }
  });
});

finishPokerGameBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("finish_poker_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo terminar Poker.");
    }
  });
});

pokerCheckBtn.addEventListener("click", () => {
  submitPokerAction("check");
});

pokerCallBtn.addEventListener("click", () => {
  submitPokerAction("call");
});

pokerFoldBtn.addEventListener("click", () => {
  submitPokerAction("fold");
});

pokerBetBtn.addEventListener("click", () => {
  submitPokerAction("bet", Number(pokerBetAmountInput.value));
});

pokerRaiseBtn.addEventListener("click", () => {
  submitPokerAction("raise", Number(pokerBetAmountInput.value));
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
  if (data.game) {
    currentGame = data.game;
  }

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

socket.on("friend_trivia_cancelled_insufficient_players", (data) => {
  currentGame = data.game;

  clearInterval(timerInterval);

  friendCancelledText.textContent =
    data.message || "La Trivia de amigos se canceló porque no hay suficientes jugadores conectados.";

  showScreen(friendCancelledScreen);
});

socket.on("friend_trivia_intro", (data) => {
  currentGame = data.game;
  renderFriendTriviaIntro(data.game);
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

socket.on("poker_intro", (data) => {
  currentGame = data.game;
  renderPokerIntro(data.game, data.settings);
});

socket.on("poker_rankings", (data) => {
  currentGame = data.game;
  renderPokerRankings(data.rankings || []);
});

socket.on("poker_settings_updated", (data) => {
  currentGame = data.game;
  isLeader = currentGame && currentGame.leaderId === socket.id;

  if (data.settings) {
    renderPokerSettingsSummary(data.settings);

    pokerSmallBlindInput.value = data.settings.smallBlind;
    pokerRoundsInput.value = data.settings.totalRounds;

    pokerSettingsHelp.textContent =
      `Ciegas: ${data.settings.smallBlind}/${data.settings.bigBlind}. Rondas: ${data.settings.totalRounds}.`;

    if (isLeader) {
      pokerLeaderSettings.classList.remove("hidden");
      pokerPlayerWaiting.classList.add("hidden");

      pokerSmallBlindInput.disabled = false;
      pokerRoundsInput.disabled = false;
      savePokerSettingsBtn.disabled = false;
      startPokerBtn.disabled = false;
    } else {
      pokerLeaderSettings.classList.add("hidden");
      pokerPlayerWaiting.classList.remove("hidden");
      pokerPlayerWaiting.textContent =
        "La configuración fue actualizada. Esperando a que el líder empiece Poker...";

      pokerSmallBlindInput.disabled = true;
      pokerRoundsInput.disabled = true;
      savePokerSettingsBtn.disabled = true;
      startPokerBtn.disabled = true;
    }
  }
});

socket.on("poker_state", (data) => {
  currentGame = data.game;
  renderPokerTable(data.pokerState);
});

socket.on("poker_finished", (data) => {
  currentGame = data.game;
  showToast(data.message || "Poker terminado.");
});

socket.on("game_cancelled_lack_players", (data) => {
  currentGame = null;
  clearInterval(timerInterval);

  showToast(data.message || "La partida terminó por falta de jugadores.");
  showScreen(cancelScreen);
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

  if (gameKnowledge && gameKnowledge.checked) selectedGames.push("knowledge");
  if (gameFriend && gameFriend.checked) selectedGames.push("friend");
  if (gameHeads && gameHeads.checked) selectedGames.push("heads");
  if (gameWord && gameWord.checked) selectedGames.push("word");
  if (gamePoker && gamePoker.checked) selectedGames.push("poker");

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

  if (gameKnowledge) gameKnowledge.checked = selectedGames.includes("knowledge");
  if (gameFriend) gameFriend.checked = selectedGames.includes("friend");
  if (gameHeads) gameHeads.checked = selectedGames.includes("heads");
  if (gameWord) gameWord.checked = selectedGames.includes("word");
  if (gamePoker) gamePoker.checked = selectedGames.includes("poker");

  if (gameKnowledge) gameKnowledge.disabled = !isLeader;
  if (gameFriend) gameFriend.disabled = !isLeader;
  if (gameHeads) gameHeads.disabled = !isLeader;
  if (gameWord) gameWord.disabled = !isLeader;
  if (gamePoker) gamePoker.disabled = !isLeader;

  if (friendUnlocked) {
    friendGameHelp.textContent = "Disponible.";
  } else {
    friendGameHelp.textContent = `Se desbloquea con 3 jugadores. Conectados: ${playerCount}/3.`;
  }
}

function renderLobby(game) {
  pinDisplay.textContent = game.pin;
  loadLobbyQR(game.pin);

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
  if (!currentGame || !currentGame.pin) {
    showToast("No se encontró la partida para votar.");
    return;
  }

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

  const themes = getCurrentThemes();

  themes.forEach((theme) => {
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

function renderFriendTriviaIntro(game) {
  currentGame = game;
  isLeader = game.leaderId === socket.id;

  if (isLeader) {
    startFriendTriviaBtn.classList.remove("hidden");
    friendIntroWaitingText.classList.add("hidden");
  } else {
    startFriendTriviaBtn.classList.add("hidden");
    friendIntroWaitingText.classList.remove("hidden");
  }

  showScreen(friendIntroScreen);
}

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

function renderPokerSettingsSummary(settings) {
  if (!settings) return;

  pokerSummaryInitialChips.textContent = settings.initialChips || 5000;
  pokerSummarySmallBlind.textContent = settings.smallBlind || 50;
  pokerSummaryBigBlind.textContent = settings.bigBlind || 100;
  pokerSummaryRounds.textContent = settings.totalRounds || 3;
}

function renderPokerIntro(game, settings) {
  currentGame = game;
  isLeader = game.leaderId === socket.id;

  renderPokerSettingsSummary(settings);

  pokerSmallBlindInput.value = settings.smallBlind;
  pokerRoundsInput.value = settings.totalRounds;
  pokerSettingsHelp.textContent =
    `Ciegas: ${settings.smallBlind}/${settings.bigBlind}. Rondas: ${settings.totalRounds}.`;

  if (isLeader) {
    pokerLeaderSettings.classList.remove("hidden");
    pokerPlayerWaiting.classList.add("hidden");

    pokerSmallBlindInput.disabled = false;
    pokerRoundsInput.disabled = false;
    savePokerSettingsBtn.disabled = false;
    startPokerBtn.disabled = false;
  } else {
    pokerLeaderSettings.classList.add("hidden");
    pokerPlayerWaiting.classList.remove("hidden");
    pokerPlayerWaiting.textContent =
      "Configuración actual de la partida. Esperando a que el líder empiece Poker...";

    pokerSmallBlindInput.disabled = true;
    pokerRoundsInput.disabled = true;
    savePokerSettingsBtn.disabled = true;
    startPokerBtn.disabled = true;
  }

  showScreen(pokerIntroScreen);
}

function submitPokerAction(action, amount = null) {
  if (!currentGame) return;

  socket.emit("submit_poker_action", {
    pin: currentGame.pin,
    action,
    amount
  }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo enviar la acción de Poker.");
    }
  });
}

function renderPokerRankings(rankings) {
  isLeader = currentGame && currentGame.leaderId === socket.id;

  pokerRankingsList.innerHTML = "";

  rankings.forEach((ranking) => {
    const row = document.createElement("div");
    row.className = "poker-ranking-row";

    const badge = document.createElement("div");
    badge.className = "poker-ranking-position";
    badge.textContent = ranking.position;

    const cards = document.createElement("div");
    cards.className = "poker-ranking-cards";

    ranking.cards.forEach((card) => {
      const cardElement = createPokerCard(card);
      cardElement.classList.add("ranking-card-sample");
      cards.appendChild(cardElement);
    });

    const text = document.createElement("div");
    text.className = "poker-ranking-text";

    const title = document.createElement("strong");
    title.textContent = ranking.name;

    const description = document.createElement("small");
    description.textContent = ranking.description;

    text.appendChild(title);
    text.appendChild(description);

    row.appendChild(badge);
    row.appendChild(cards);
    row.appendChild(text);

    pokerRankingsList.appendChild(row);
  });

  if (isLeader) {
    pokerRankingsLeaderControls.classList.remove("hidden");
    pokerRankingsWaiting.classList.add("hidden");
  } else {
    pokerRankingsLeaderControls.classList.add("hidden");
    pokerRankingsWaiting.classList.remove("hidden");
  }

  showScreen(pokerRankingsScreen);
}

function renderPokerTable(pokerState) {
  pokerRoundText.textContent = `Mano ${pokerState.roundNumber}/${pokerState.totalRounds} · ${pokerState.stageLabel}`;
  pokerBlindText.textContent = `SB ${pokerState.smallBlind} · BB ${pokerState.bigBlind}`;

  pokerStatusText.textContent = pokerState.lastActionMessage || pokerState.message || "Esperando...";
  pokerCurrentTurnText.textContent = pokerState.currentPlayerName
    ? `Turno actual: ${pokerState.currentPlayerName}`
    : "Sin turno activo";

  renderPokerActionTimer(pokerState);

  renderPokerShowdownResults(pokerState.showdownResults || []);

  pokerPlayersRing.innerHTML = "";

  pokerState.players.forEach((player) => {
    const div = document.createElement("div");
    div.className = "poker-player-chip";

    if (player.isYou) {
      div.classList.add("is-you");
    }

    if (player.isCurrentPlayer) {
      div.classList.add("is-current");
    }

    if (player.folded) {
      div.classList.add("is-folded");
    }

    if (player.isOut) {
      div.classList.add("is-out");
    }

    const badges = [];

    if (player.isDealer) badges.push("D");
    if (player.isSmallBlind) badges.push("SB");
    if (player.isBigBlind) badges.push("BB");
    if (player.allIn) badges.push("ALL-IN");
    if (player.folded) badges.push("FUERA");
    if (player.isOut) badges.push("SIN FICHAS");

    const revealedCardsHtml = player.revealedCards && player.revealedCards.length
      ? `<div class="poker-mini-cards">${player.revealedCards.map(cardToHtml).join("")}</div>`
      : "";

    const handHtml = player.bestHandDescription
      ? `<small>${player.bestHandDescription}</small>`
      : "";

    const payoutHtml = player.payout > 0
      ? `<small>Ganó: ${player.payout}</small>`
      : "";
    
    div.innerHTML = `
      <strong>${player.name}</strong>
      <span>${player.chips} fichas</span>
      <small>Invertido mano: ${player.committed}</small>
      <small>Apuesta ronda: ${player.streetBet}</small>
      <small>${badges.join(" · ")}</small>
      ${handHtml}
      ${payoutHtml}
      ${revealedCardsHtml}
    `;

    pokerPlayersRing.appendChild(div);
  });

  pokerCommunityCards.innerHTML = "";

  const communityCards = pokerState.communityCards || [];

  for (let i = 0; i < 5; i++) {
    const card = communityCards[i];

    if (card) {
      pokerCommunityCards.appendChild(createPokerCard(card));
    } else {
      pokerCommunityCards.appendChild(createPokerCardBack());
    }
  }

  pokerPlayerCards.innerHTML = "";

  const yourCards = pokerState.yourCards || [];

  if (yourCards.length) {
    yourCards.forEach((card) => {
      pokerPlayerCards.appendChild(createPokerCard(card));
    });
  } else {
    pokerPlayerCards.appendChild(createPokerCardBack());
    pokerPlayerCards.appendChild(createPokerCardBack());
  }

  renderPokerActions(pokerState);

  if (pokerState.canStartNextHand || pokerState.canFinishPoker) {
    pokerLeaderControls.classList.remove("hidden");
  } else {
    pokerLeaderControls.classList.add("hidden");
  }

  nextPokerHandBtn.classList.toggle("hidden", !pokerState.canStartNextHand);
  finishPokerGameBtn.classList.toggle("hidden", !pokerState.canFinishPoker);

  showScreen(pokerScreen);
}

function renderPokerActionTimer(pokerState) {
  if (pokerActionTimerInterval) {
    clearInterval(pokerActionTimerInterval);
    pokerActionTimerInterval = null;
  }

  if (!pokerState.actionEndsAt || !pokerState.currentPlayerName) {
    pokerActionTimerText.classList.add("hidden");
    pokerActionTimerText.textContent = "";
    return;
  }

  pokerActionTimerText.classList.remove("hidden");

  function updateTimerText() {
    const remainingMs = Math.max(0, pokerState.actionEndsAt - Date.now());
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (pokerState.isYourTurn) {
      pokerActionTimerText.textContent = `Tu turno acaba en: ${remainingSeconds}s`;
    } else {
      pokerActionTimerText.textContent = `${pokerState.currentPlayerName}: ${remainingSeconds}s`;
    }

    if (remainingSeconds <= 0 && pokerActionTimerInterval) {
      clearInterval(pokerActionTimerInterval);
      pokerActionTimerInterval = null;
    }
  }

  updateTimerText();
  pokerActionTimerInterval = setInterval(updateTimerText, 500);
}

function renderPokerShowdownResults(results) {
  pokerShowdownList.innerHTML = "";

  if (!results.length) {
    pokerShowdownList.classList.add("hidden");
    return;
  }

  pokerShowdownList.classList.remove("hidden");

  results.forEach((result) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>Bote ${result.potNumber}</strong>
      <span>${result.winnerNames.join(", ")} ganó ${result.amount}</span>
      <small>${result.description}</small>
    `;

    pokerShowdownList.appendChild(li);
  });
}

function renderPokerActions(pokerState) {
  const actions = pokerState.availableActions || {};

  pokerActionPanel.classList.remove("hidden");

  if (pokerState.isYourTurn) {
    pokerTurnText.textContent = "Es tu turno";
  } else {
    pokerTurnText.textContent = "Tu panel";
  }

  pokerCheckBtn.classList.toggle("hidden", !actions.check);
  pokerCallBtn.classList.toggle("hidden", !actions.call);
  pokerBetBtn.classList.toggle("hidden", !actions.bet);
  pokerRaiseBtn.classList.toggle("hidden", !actions.raise);
  pokerFoldBtn.classList.toggle("hidden", !actions.fold);

  if (actions.call) {
    pokerCallBtn.textContent = `Igualar ${actions.callAmount}`;
  } else {
    pokerCallBtn.textContent = "Igualar";
  }

  if (actions.bet) {
    pokerBetAmountInput.placeholder = `Apuesta mínima ${actions.minBet}`;
    pokerActionHelp.textContent = `Puedes apostar mínimo ${actions.minBet}.`;
  } else if (actions.raise) {
    pokerBetAmountInput.placeholder = `Subir a mínimo ${actions.minRaiseTo}`;
    pokerActionHelp.textContent = `Debes subir a mínimo ${actions.minRaiseTo}.`;
  } else if (!pokerState.isYourTurn) {
    pokerActionHelp.textContent = "Espera tu turno para actuar.";
  } else {
    pokerActionHelp.textContent = "";
  }

  const showBetInput = actions.bet || actions.raise;
  pokerBetAmountInput.classList.toggle("hidden", !showBetInput);

  if (!pokerState.isYourTurn) {
    pokerCheckBtn.classList.add("hidden");
    pokerCallBtn.classList.add("hidden");
    pokerBetBtn.classList.add("hidden");
    pokerRaiseBtn.classList.add("hidden");
    pokerFoldBtn.classList.add("hidden");
    pokerBetAmountInput.classList.add("hidden");
  }
}

function createPokerCard(card) {
  const div = document.createElement("div");
  div.className = `poker-card ${card.color === "red" ? "red" : "black"}`;

  div.innerHTML = `
    <span class="poker-card-rank">${card.rank}</span>
    <span class="poker-card-suit">${card.symbol}</span>
  `;

  return div;
}

function createPokerCardBack() {
  const card = document.createElement("div");
  card.className = "poker-card back";
  return card;
}

function cardToHtml(card) {
  const colorClass = card.color === "red" ? "red" : "black";

  return `
    <div class="poker-card mini ${colorClass}">
      <span class="poker-card-rank">${card.rank}</span>
      <span class="poker-card-suit">${card.symbol}</span>
    </div>
  `;
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
