const socket = io();

let currentGame = null;
let isLeader = false;
let selectedTheme = null;
let timerInterval = null;
let directJoinPin = null;
let currentCampaign = null;
let currentCampaignSlug = "demo";
let pokerActionTimerInterval = null;
let wordConnectLetters = [];
let selectedWordLetterIndexes = [];
let wordConnectOpen = false;
let wordSubmissionPending = false;
let activeScreen = null;
let stopLetterInterval = null;
let stopAnswerPending = false;
let stopVotePending = false;
let currentCachoState = null;
let selectedCachoFace = 2;
let cachoActionPending = false;
let currentLastCardState = null;
let lastCardActionPending = false;
let selectedWildCardId = null;
let lastCardCalled = false;

const CLIENT_ID_STORAGE_KEY = "juegosQrPartyClientId";

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
const stopIntroScreen = document.getElementById("stopIntroScreen");
const stopLetterScreen = document.getElementById("stopLetterScreen");
const stopAnswerScreen = document.getElementById("stopAnswerScreen");
const stopAnswersWaitingScreen = document.getElementById("stopAnswersWaitingScreen");
const stopVotingScreen = document.getElementById("stopVotingScreen");
const stopResultScreen = document.getElementById("stopResultScreen");
const impostorIntroScreen = document.getElementById("impostorIntroScreen");
const impostorRoleScreen = document.getElementById("impostorRoleScreen");
const impostorVotingScreen = document.getElementById("impostorVotingScreen");
const impostorResultScreen = document.getElementById("impostorResultScreen");
const cachoIntroScreen = document.getElementById("cachoIntroScreen");
const cachoScreen = document.getElementById("cachoScreen");
const cachoResultScreen = document.getElementById("cachoResultScreen");
const lastCardIntroScreen = document.getElementById("lastCardIntroScreen");
const lastCardScreen = document.getElementById("lastCardScreen");
const lastCardResultScreen = document.getElementById("lastCardResultScreen");
const betweenGamesScreen = document.getElementById("betweenGamesScreen");
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
const gameStop = document.getElementById("gameStop");
const gameImpostor = document.getElementById("gameImpostor");
const gameCacho = document.getElementById("gameCacho");
const gameLastCard = document.getElementById("gameLastCard");
const friendGameHelp = document.getElementById("friendGameHelp");
const gamePoker = document.getElementById("gamePoker");

const gameCheckboxes = [
  gameKnowledge,
  gameFriend,
  gameHeads,
  gameWord,
  gameStop,
  gameImpostor,
  gameCacho,
  gameLastCard,
  gamePoker
].filter(Boolean);
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

// Votazo
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
const friendResultLeaderControls = document.getElementById("friendResultLeaderControls");
const continueFriendQuestionBtn = document.getElementById("continueFriendQuestionBtn");
const friendOptionsResultList = document.getElementById("friendOptionsResultList");
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
const headsResultLeaderControls = document.getElementById("headsResultLeaderControls");
const continueHeadsTurnBtn = document.getElementById("continueHeadsTurnBtn");

// Word Connect
const startWordConnectBtn = document.getElementById("startWordConnectBtn");
const wordIntroWaitingText = document.getElementById("wordIntroWaitingText");

const wordTimerText = document.getElementById("wordTimerText");
const wordTimerFill = document.getElementById("wordTimerFill");
const wordLettersBox = document.getElementById("wordLettersBox");
const wordComposer = document.getElementById("wordComposer");
const submitWordBtn = document.getElementById("submitWordBtn");
const wordStatusText = document.getElementById("wordStatusText");
const foundWordsList = document.getElementById("foundWordsList");
const wordRankingList = document.getElementById("wordRankingList");

const validWordsText = document.getElementById("validWordsText");
const wordResultsList = document.getElementById("wordResultsList");
const wordFinalRankingList = document.getElementById("wordFinalRankingList");
const wordResultLeaderControls = document.getElementById("wordResultLeaderControls");
const continueWordResultBtn = document.getElementById("continueWordResultBtn");

// STOP
const startStopBtn = document.getElementById("startStopBtn");
const stopIntroWaitingText = document.getElementById("stopIntroWaitingText");
const stopLetterDisplay = document.getElementById("stopLetterDisplay");
const stopLetterStatus = document.getElementById("stopLetterStatus");
const stopCategoryCounter = document.getElementById("stopCategoryCounter");
const stopAnswerTimerText = document.getElementById("stopAnswerTimerText");
const stopAnswerTimerFill = document.getElementById("stopAnswerTimerFill");
const stopAnswerLetter = document.getElementById("stopAnswerLetter");
const stopCategoryText = document.getElementById("stopCategoryText");
const stopAnswerInput = document.getElementById("stopAnswerInput");
const passStopAnswerBtn = document.getElementById("passStopAnswerBtn");
const submitStopAnswerBtn = document.getElementById("submitStopAnswerBtn");
const stopAnswerStatus = document.getElementById("stopAnswerStatus");
const stopVoteCounter = document.getElementById("stopVoteCounter");
const stopVoteTimerText = document.getElementById("stopVoteTimerText");
const stopVoteTimerFill = document.getElementById("stopVoteTimerFill");
const stopVoteCategory = document.getElementById("stopVoteCategory");
const stopVotePlayer = document.getElementById("stopVotePlayer");
const stopVoteWord = document.getElementById("stopVoteWord");
const stopVoteControls = document.getElementById("stopVoteControls");
const rejectStopVoteBtn = document.getElementById("rejectStopVoteBtn");
const acceptStopVoteBtn = document.getElementById("acceptStopVoteBtn");
const stopVoteStatus = document.getElementById("stopVoteStatus");
const stopResultLeaderControls = document.getElementById("stopResultLeaderControls");
const continueStopResultBtn = document.getElementById("continueStopResultBtn");
const stopResultTitle = document.getElementById("stopResultTitle");
const stopPlayerResultsList = document.getElementById("stopPlayerResultsList");
const stopVoteResultsList = document.getElementById("stopVoteResultsList");
const stopFinalRankingList = document.getElementById("stopFinalRankingList");

// Impostor
const startImpostorBtn = document.getElementById("startImpostorBtn");
const impostorIntroWaitingText = document.getElementById("impostorIntroWaitingText");
const impostorRolePanel = document.getElementById("impostorRolePanel");
const impostorRoleLabel = document.getElementById("impostorRoleLabel");
const impostorRoleValue = document.getElementById("impostorRoleValue");
const impostorRoleHint = document.getElementById("impostorRoleHint");
const impostorReadyBtn = document.getElementById("impostorReadyBtn");
const impostorRoleStatus = document.getElementById("impostorRoleStatus");
const impostorVotingLeaderControls = document.getElementById("impostorVotingLeaderControls");
const finishImpostorRoundBtn = document.getElementById("finishImpostorRoundBtn");
const impostorVotingTitle = document.getElementById("impostorVotingTitle");
const impostorPlayersList = document.getElementById("impostorPlayersList");
const impostorVoteStatus = document.getElementById("impostorVoteStatus");
const impostorVoteProgress = document.getElementById("impostorVoteProgress");
const impostorResultLeaderControls = document.getElementById("impostorResultLeaderControls");
const continueImpostorRoundBtn = document.getElementById("continueImpostorRoundBtn");
const impostorResultTitle = document.getElementById("impostorResultTitle");
const impostorResultText = document.getElementById("impostorResultText");
const impostorRevealBox = document.getElementById("impostorRevealBox");
const impostorRevealName = document.getElementById("impostorRevealName");
const impostorRevealWord = document.getElementById("impostorRevealWord");
const impostorActiveTitle = document.getElementById("impostorActiveTitle");
const impostorActivePlayersList = document.getElementById("impostorActivePlayersList");
const impostorFinalRanking = document.getElementById("impostorFinalRanking");
const impostorRankingList = document.getElementById("impostorRankingList");

// Cacho
const startCachoBtn = document.getElementById("startCachoBtn");
const cachoIntroWaitingText = document.getElementById("cachoIntroWaitingText");
const cachoRoundText = document.getElementById("cachoRoundText");
const cachoTimerText = document.getElementById("cachoTimerText");
const cachoTimerFill = document.getElementById("cachoTimerFill");
const cachoPlayersList = document.getElementById("cachoPlayersList");
const cachoCurrentBid = document.getElementById("cachoCurrentBid");
const cachoCurrentBidText = document.getElementById("cachoCurrentBidText");
const cachoCurrentBidder = document.getElementById("cachoCurrentBidder");
const cachoTurnText = document.getElementById("cachoTurnText");
const cachoDice = document.getElementById("cachoDice");
const cachoControls = document.getElementById("cachoControls");
const cachoQuantityInput = document.getElementById("cachoQuantityInput");
const cachoFaceSelector = document.getElementById("cachoFaceSelector");
const cachoFaceButtons = document.querySelectorAll(".cacho-face-btn");
const submitCachoBidBtn = document.getElementById("submitCachoBidBtn");
const callCachoDoubtBtn = document.getElementById("callCachoDoubtBtn");
const cachoStatusText = document.getElementById("cachoStatusText");
const cachoResultLeaderControls = document.getElementById("cachoResultLeaderControls");
const continueCachoResultBtn = document.getElementById("continueCachoResultBtn");
const cachoResultTitle = document.getElementById("cachoResultTitle");
const cachoResultSummary = document.getElementById("cachoResultSummary");
const cachoCountResult = document.getElementById("cachoCountResult");
const cachoRevealedDiceList = document.getElementById("cachoRevealedDiceList");
const cachoLoserText = document.getElementById("cachoLoserText");
const cachoFinalRanking = document.getElementById("cachoFinalRanking");
const cachoRankingList = document.getElementById("cachoRankingList");

// ÚLTIMA CARTA
const startLastCardBtn = document.getElementById("startLastCardBtn");
const lastCardIntroWaitingText = document.getElementById("lastCardIntroWaitingText");
const lastCardTurnText = document.getElementById("lastCardTurnText");
const lastCardTimerText = document.getElementById("lastCardTimerText");
const lastCardTimerFill = document.getElementById("lastCardTimerFill");
const lastCardDirectionText = document.getElementById("lastCardDirectionText");
const lastCardActiveColor = document.getElementById("lastCardActiveColor");
const lastCardPlayersList = document.getElementById("lastCardPlayersList");
const drawLastCardBtn = document.getElementById("drawLastCardBtn");
const lastCardDrawCount = document.getElementById("lastCardDrawCount");
const lastCardTopCard = document.getElementById("lastCardTopCard");
const lastCardStatusText = document.getElementById("lastCardStatusText");
const lastCardColorPicker = document.getElementById("lastCardColorPicker");
const lastCardColorOptions = document.querySelectorAll(".last-card-color-option");
const cancelLastCardColorBtn = document.getElementById("cancelLastCardColorBtn");
const lastCardHand = document.getElementById("lastCardHand");
const callLastCardBtn = document.getElementById("callLastCardBtn");
const passLastCardBtn = document.getElementById("passLastCardBtn");
const lastCardResultLeaderControls = document.getElementById("lastCardResultLeaderControls");
const continueLastCardResultBtn = document.getElementById("continueLastCardResultBtn");
const lastCardWinnerText = document.getElementById("lastCardWinnerText");
const lastCardRoundPointsText = document.getElementById("lastCardRoundPointsText");
const lastCardResultsList = document.getElementById("lastCardResultsList");
const lastCardFinalRankingList = document.getElementById("lastCardFinalRankingList");

// Marcador entre juegos
const betweenGamesLeaderControls = document.getElementById("betweenGamesLeaderControls");
const continueAfterScoreboardBtn = document.getElementById("continueAfterScoreboardBtn");
const betweenGamesTitle = document.getElementById("betweenGamesTitle");
const betweenGamesSubtitle = document.getElementById("betweenGamesSubtitle");
const betweenGamesRankingList = document.getElementById("betweenGamesRankingList");

// Poker
const pokerLeaderSettings = document.getElementById("pokerLeaderSettings");
const pokerSettingsSummary = document.getElementById("pokerSettingsSummary");
const pokerPlayerWaiting = document.getElementById("pokerPlayerWaiting");
const pokerInitialChipsInput = document.getElementById("pokerInitialChipsInput");
const pokerSmallBlindInput = document.getElementById("pokerSmallBlindInput");
const pokerBigBlindInput = document.getElementById("pokerBigBlindInput");
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
const pokerPotText = document.getElementById("pokerPotText");
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
const pokerCurrentChipsText = document.getElementById("pokerCurrentChipsText");
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
  const isNewScreen = activeScreen !== screen;

  if (screen !== stopLetterScreen && stopLetterInterval) {
    clearInterval(stopLetterInterval);
    stopLetterInterval = null;
  }

  if (screen !== pokerScreen && pokerActionTimerInterval) {
    clearInterval(pokerActionTimerInterval);
    pokerActionTimerInterval = null;
  }

  if (!isNewScreen) {
    screen.classList.remove("hidden");
    return;
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
  stopIntroScreen.classList.add("hidden");
  stopLetterScreen.classList.add("hidden");
  stopAnswerScreen.classList.add("hidden");
  stopAnswersWaitingScreen.classList.add("hidden");
  stopVotingScreen.classList.add("hidden");
  stopResultScreen.classList.add("hidden");
  lastCardIntroScreen.classList.add("hidden");
  lastCardScreen.classList.add("hidden");
  lastCardResultScreen.classList.add("hidden");
  betweenGamesScreen.classList.add("hidden");
  pokerIntroScreen.classList.add("hidden");
  pokerRankingsScreen.classList.add("hidden");
  pokerScreen.classList.add("hidden");
  cancelScreen.classList.add("hidden");
  finalScreen.classList.add("hidden");

  screen.classList.remove("hidden");
  activeScreen = screen;

  if (isNewScreen) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }
}

function getClientId() {
  let clientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);

  if (!clientId) {
    clientId = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  }

  return clientId;
}

function getPlayerName() {
  return playerNameInput.value.trim();
}

function cleanPinInput(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

function returnToCampaignHome(message = "") {
  currentGame = null;
  isLeader = false;
  directJoinPin = null;

  const campaignPath = `/juegos/${encodeURIComponent(currentCampaignSlug || "demo")}`;
  window.history.replaceState({}, "", campaignPath);
  showScreen(homeScreen);

  if (message) {
    showToast(message);
  }
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

  if (gameStop && gameStop.closest(".game-option")) {
    gameStop.closest(".game-option").classList.toggle("hidden", !available.stop);
  }

  if (gameImpostor && gameImpostor.closest(".game-option")) {
    gameImpostor.closest(".game-option").classList.toggle("hidden", !available.impostor);
  }

  if (gameCacho && gameCacho.closest(".game-option")) {
    gameCacho.closest(".game-option").classList.toggle("hidden", !available.cacho);
  }

  if (gameLastCard && gameLastCard.closest(".game-option")) {
    gameLastCard.closest(".game-option").classList.toggle("hidden", !available.lastcard);
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

  socket.emit("create_game", {
    name,
    campaignSlug: currentCampaignSlug,
    clientId: getClientId()
  }, (response) => {
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

  socket.emit("join_game", { pin, name, clientId: getClientId() }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo unir a la partida.");
      return;
    }

    currentGame = response.game;
    isLeader = response.game.leaderId === socket.id;

    if (response.game.status === "lobby") {
      renderLobby(response.game);
    }
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

  socket.emit("join_game", { pin: directJoinPin, name, clientId: getClientId() }, (response) => {
    if (!response.ok) {
      returnToCampaignHome(response.message || "La partida ya no está disponible.");
      return;
    }

    currentGame = response.game;
    isLeader = response.game.leaderId === socket.id;

    if (response.game.status === "lobby") {
      renderLobby(response.game);
    }
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

continueAfterScoreboardBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("continue_after_scoreboard", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo continuar.");
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
  returnToCampaignHome();
});

cancelHomeBtn.addEventListener("click", () => {
  returnToCampaignHome();
});

startFriendTriviaBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_friend_trivia_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar Votazo.");
    }
  });
});

continueFriendQuestionBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("continue_friend_question", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo continuar.");
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

continueHeadsTurnBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("continue_heads_up_turn", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo continuar.");
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
    initialChips: Number(pokerInitialChipsInput.value),
    smallBlind: Number(pokerSmallBlindInput.value),
    bigBlind: Number(pokerBigBlindInput.value),
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

// --------------------------------------------------
// Eventos del servidor
// --------------------------------------------------

socket.on("connect", () => {
  if (!currentGame || !currentGame.pin) return;

  socket.emit("resume_game", {
    pin: currentGame.pin,
    clientId: getClientId()
  }, (response) => {
    if (!response || !response.ok) return;

    currentGame = response.game;
    isLeader = response.game.leaderId === socket.id;
  });
});

startStopBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_stop_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar STOP.");
    }
  });
});

stopAnswerInput.addEventListener("input", () => {
  submitStopAnswerBtn.disabled = stopAnswerPending || !stopAnswerInput.value.trim();
});

stopAnswerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || submitStopAnswerBtn.disabled) return;

  event.preventDefault();
  submitStopAnswer(false);
});

passStopAnswerBtn.addEventListener("click", () => {
  submitStopAnswer(true);
});

submitStopAnswerBtn.addEventListener("click", () => {
  submitStopAnswer(false);
});

rejectStopVoteBtn.addEventListener("click", () => {
  submitStopVote(false);
});

acceptStopVoteBtn.addEventListener("click", () => {
  submitStopVote(true);
});

continueWordResultBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("continue_word_connect_result", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo continuar.");
    }
  });
});

continueStopResultBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("continue_stop_result", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo continuar.");
    }
  });
});

startImpostorBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_impostor_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar Impostor.");
    }
  });
});

impostorReadyBtn.addEventListener("click", () => {
  if (!currentGame) return;

  impostorReadyBtn.disabled = true;
  socket.emit("impostor_ready", { pin: currentGame.pin }, (response) => {
    if (response.ok) {
      impostorRolePanel.classList.add("is-hidden-role");
      impostorRoleStatus.textContent = "Rol oculto. Esperando a los demás...";
      return;
    }

    impostorReadyBtn.disabled = false;
    showToast(response.message || "No se pudo confirmar tu rol.");
  });
});

finishImpostorRoundBtn.addEventListener("click", () => {
  if (!currentGame) return;

  finishImpostorRoundBtn.disabled = true;
  socket.emit("finish_impostor_round", { pin: currentGame.pin }, (response) => {
    if (response.ok) return;

    finishImpostorRoundBtn.disabled = false;
    showToast(response.message || "No se pudo terminar la ronda.");
  });
});

continueImpostorRoundBtn.addEventListener("click", () => {
  if (!currentGame) return;

  continueImpostorRoundBtn.disabled = true;
  socket.emit("continue_impostor_round", { pin: currentGame.pin }, (response) => {
    if (response.ok) return;

    continueImpostorRoundBtn.disabled = false;
    showToast(response.message || "No se pudo continuar.");
  });
});

startCachoBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_cacho_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar Cacho.");
    }
  });
});

cachoFaceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCachoFace = Number(button.dataset.face);
    renderCachoControls();
  });
});

submitCachoBidBtn.addEventListener("click", () => {
  if (!currentGame || cachoActionPending) return;

  cachoActionPending = true;
  renderCachoControls();
  socket.emit("submit_cacho_bid", {
    pin: currentGame.pin,
    quantity: Number(cachoQuantityInput.value),
    face: selectedCachoFace
  }, (response) => {
    if (response.ok) return;

    cachoActionPending = false;
    renderCachoControls();
    showToast(response.message || "No se pudo hacer la apuesta.");
  });
});

callCachoDoubtBtn.addEventListener("click", () => {
  if (!currentGame || cachoActionPending) return;

  cachoActionPending = true;
  renderCachoControls();
  socket.emit("call_cacho_doubt", { pin: currentGame.pin }, (response) => {
    if (response.ok) return;

    cachoActionPending = false;
    renderCachoControls();
    showToast(response.message || "No se pudo declarar Dudo.");
  });
});

continueCachoResultBtn.addEventListener("click", () => {
  if (!currentGame) return;

  continueCachoResultBtn.disabled = true;
  socket.emit("continue_cacho_result", { pin: currentGame.pin }, (response) => {
    if (response.ok) return;

    continueCachoResultBtn.disabled = false;
    showToast(response.message || "No se pudo continuar.");
  });
});

startLastCardBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("start_last_card_game", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo empezar ÚLTIMA CARTA.");
    }
  });
});

drawLastCardBtn.addEventListener("click", () => {
  if (!currentGame || lastCardActionPending) return;

  lastCardActionPending = true;
  renderLastCardControls();

  socket.emit("draw_last_card", { pin: currentGame.pin }, (response) => {
    if (response.ok) return;

    lastCardActionPending = false;
    lastCardStatusText.textContent = response.message || "No se pudo robar una carta.";
    renderLastCardControls();
  });
});

passLastCardBtn.addEventListener("click", () => {
  if (!currentGame || lastCardActionPending) return;

  lastCardActionPending = true;
  renderLastCardControls();

  socket.emit("pass_last_card_turn", { pin: currentGame.pin }, (response) => {
    if (response.ok) return;

    lastCardActionPending = false;
    lastCardStatusText.textContent = response.message || "No se pudo pasar.";
    renderLastCardControls();
  });
});

callLastCardBtn.addEventListener("click", () => {
  if (callLastCardBtn.disabled) return;

  lastCardCalled = !lastCardCalled;
  callLastCardBtn.classList.toggle("is-called", lastCardCalled);
  callLastCardBtn.setAttribute("aria-pressed", String(lastCardCalled));
});

lastCardColorOptions.forEach((button) => {
  button.addEventListener("click", () => {
    if (!selectedWildCardId) return;
    playLastCardCard(selectedWildCardId, button.dataset.color);
  });
});

cancelLastCardColorBtn.addEventListener("click", () => {
  selectedWildCardId = null;
  lastCardColorPicker.classList.add("hidden");
});

continueLastCardResultBtn.addEventListener("click", () => {
  if (!currentGame) return;

  socket.emit("continue_last_card_result", { pin: currentGame.pin }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo continuar.");
    }
  });
});

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
});

socket.on("friend_trivia_cancelled_insufficient_players", (data) => {
  currentGame = data.game;

  clearInterval(timerInterval);

  friendCancelledText.textContent =
    data.message || "Votazo se canceló porque no hay suficientes jugadores conectados.";

  showScreen(friendCancelledScreen);
});

socket.on("friend_trivia_intro", (data) => {
  currentGame = data.game;
  renderFriendTriviaIntro(data.game);
});

socket.on("friend_trivia_started", (data) => {
  currentGame = data.game;
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
});

socket.on("heads_up_turn_started", (data) => {
  currentGame = data.game;
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

socket.on("stop_intro", (data) => {
  currentGame = data.game;
  renderStopIntro(data.game);
});

socket.on("stop_letter_selection_started", (data) => {
  currentGame = data.game;
  renderStopLetterSelection(data);
});

socket.on("stop_letter_revealed", (data) => {
  currentGame = data.game;
  renderStopLetterRevealed(data);
});

socket.on("stop_category_prompt", (data) => {
  currentGame = data.game;
  renderStopCategoryPrompt(data.prompt);
});

socket.on("stop_answers_complete", (data) => {
  currentGame = data.game;
  clearInterval(timerInterval);
  showScreen(stopAnswersWaitingScreen);
});

socket.on("stop_voting_started", (data) => {
  currentGame = data.game;
  stopVoteCounter.textContent = data.totalWords
    ? `Preparando ${data.totalWords} palabra${data.totalWords === 1 ? "" : "s"}`
    : "Sin palabras para votar";
  stopVoteTimerText.textContent = "";
  stopVoteTimerFill.style.width = "100%";
  stopVoteCategory.textContent = "";
  stopVotePlayer.textContent = "";
  stopVoteWord.textContent = "Preparando votación...";
  stopVoteControls.classList.add("hidden");
  stopVoteStatus.textContent = "";
  showScreen(stopVotingScreen);
});

socket.on("stop_vote_item", (data) => {
  currentGame = data.game;
  renderStopVoteItem(data.vote);
});

socket.on("stop_votes_updated", (data) => {
  stopVoteStatus.textContent =
    `Votos recibidos: ${data.receivedVotes}/${data.totalVoters}`;
});

socket.on("stop_vote_result", (data) => {
  currentGame = data.game;
  renderStopVoteResult(data.result);
});

socket.on("stop_finished", (data) => {
  currentGame = data.game;
  renderStopResult(data);
});

socket.on("impostor_intro", (data) => {
  currentGame = data.game;
  renderImpostorIntro(data.game);
});

socket.on("impostor_role", (data) => {
  currentGame = data.game;
  renderImpostorRole(data.role);
});

socket.on("impostor_ready_progress", (data) => {
  impostorRoleStatus.textContent =
    `Listos: ${data.readyCount}/${data.totalPlayers}. Esperando a los demás...`;
});

socket.on("impostor_voting", (data) => {
  currentGame = data.game;
  renderImpostorVoting(data.voting);
});

socket.on("impostor_vote_progress", (data) => {
  impostorVoteProgress.textContent =
    `Votos enviados: ${data.submittedCount}/${data.totalVoters}`;
});

socket.on("impostor_round_result", (data) => {
  currentGame = data.game;
  renderImpostorResult(data.result);
});

socket.on("cacho_intro", (data) => {
  currentGame = data.game;
  renderCachoIntro(data.game);
});

socket.on("cacho_state", (data) => {
  currentGame = data.game;
  renderCachoGame(data.cachoState);
});

socket.on("cacho_round_result", (data) => {
  currentGame = data.game;
  renderCachoResult(data.result);
});

socket.on("last_card_intro", (data) => {
  currentGame = data.game;
  renderLastCardIntro(data.game);
});

socket.on("last_card_state", (data) => {
  currentGame = data.game;
  renderLastCardGame(data.lastCardState);
});

socket.on("last_card_finished", (data) => {
  currentGame = data.game;
  renderLastCardResult(data);
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

    pokerInitialChipsInput.value = data.settings.initialChips;
    pokerSmallBlindInput.value = data.settings.smallBlind;
    pokerBigBlindInput.value = data.settings.bigBlind;
    pokerRoundsInput.value = data.settings.totalRounds;

    pokerSettingsHelp.textContent =
      `Ciegas: ${data.settings.smallBlind}/${data.settings.bigBlind}. Rondas: ${data.settings.totalRounds}.`;

    if (isLeader) {
      pokerSettingsSummary.classList.add("hidden");
      pokerLeaderSettings.classList.remove("hidden");
      pokerPlayerWaiting.classList.add("hidden");

      pokerInitialChipsInput.disabled = false;
      pokerSmallBlindInput.disabled = false;
      pokerBigBlindInput.disabled = false;
      pokerRoundsInput.disabled = false;
      savePokerSettingsBtn.disabled = false;
      startPokerBtn.disabled = false;
    } else {
      pokerSettingsSummary.classList.remove("hidden");
      pokerLeaderSettings.classList.add("hidden");
      pokerPlayerWaiting.classList.remove("hidden");
      pokerPlayerWaiting.textContent =
        "La configuración fue actualizada. Esperando a que el líder empiece Poker...";

      pokerInitialChipsInput.disabled = true;
      pokerSmallBlindInput.disabled = true;
      pokerBigBlindInput.disabled = true;
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
});

socket.on("between_games_scoreboard", (data) => {
  currentGame = data.game;
  isLeader = data.game.leaderId === socket.id;

  renderBetweenGamesScoreboard(data);
});

socket.on("removed_from_game", (data) => {
  returnToCampaignHome(data.message || "Fuiste eliminado de la partida.");
});

socket.on("game_cancelled_lack_players", (data) => {
  currentGame = null;
  clearInterval(timerInterval);

  showToast(data.message || "La partida terminó por falta de jugadores.");
  showScreen(cancelScreen);
});

socket.on("game_finished", (data) => {
  currentGame = data.game;
  isLeader = data.game.leaderId === socket.id;

  const winner = data.ranking && data.ranking[0];
  renderLobby(data.game);
  showToast(
    winner
      ? `Partida terminada. Ganó ${winner.name}. Ya pueden elegir y jugar de nuevo.`
      : "Partida terminada. Ya pueden elegir y jugar de nuevo."
  );
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
  if (gameStop && gameStop.checked) selectedGames.push("stop");
  if (gameImpostor && gameImpostor.checked) selectedGames.push("impostor");
  if (gameCacho && gameCacho.checked) selectedGames.push("cacho");
  if (gameLastCard && gameLastCard.checked) selectedGames.push("lastcard");
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

function removePlayerFromLobby(playerId) {
  if (!currentGame || !isLeader || !playerId) return;

  socket.emit("remove_player", {
    pin: currentGame.pin,
    playerId
  }, (response) => {
    if (!response.ok) {
      showToast(response.message || "No se pudo eliminar al jugador.");
    }
  });
}

function renderGameSelection(game) {
  const selectedGames = game.selectedGames || ["knowledge", "heads", "word"];

  if (gameKnowledge) gameKnowledge.checked = selectedGames.includes("knowledge");
  if (gameFriend) gameFriend.checked = selectedGames.includes("friend");
  if (gameHeads) gameHeads.checked = selectedGames.includes("heads");
  if (gameWord) gameWord.checked = selectedGames.includes("word");
  if (gameStop) gameStop.checked = selectedGames.includes("stop");
  if (gameImpostor) gameImpostor.checked = selectedGames.includes("impostor");
  if (gameCacho) gameCacho.checked = selectedGames.includes("cacho");
  if (gameLastCard) gameLastCard.checked = selectedGames.includes("lastcard");
  if (gamePoker) gamePoker.checked = selectedGames.includes("poker");

  if (gameKnowledge) gameKnowledge.disabled = !isLeader;
  if (gameFriend) gameFriend.disabled = !isLeader;
  if (gameHeads) gameHeads.disabled = !isLeader;
  if (gameWord) gameWord.disabled = !isLeader;
  if (gameStop) gameStop.disabled = !isLeader;
  if (gameImpostor) gameImpostor.disabled = !isLeader;
  if (gameCacho) gameCacho.disabled = !isLeader;
  if (gameLastCard) gameLastCard.disabled = !isLeader;
  if (gamePoker) gamePoker.disabled = !isLeader;

  friendGameHelp.textContent = "Disponible.";
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
    li.className = "player-row";

    const playerInfo = document.createElement("span");
    playerInfo.className = "player-row-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-row-name";
    nameSpan.textContent = player.name;

    playerInfo.appendChild(nameSpan);

    if (player.isLeader) {
      const leaderTag = document.createElement("span");
      leaderTag.className = "leader-tag";
      leaderTag.textContent = "Líder";
      playerInfo.appendChild(leaderTag);
    }

    li.appendChild(playerInfo);

    if (isLeader && !player.isLeader) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-player-btn";
      removeButton.setAttribute("aria-label", `Eliminar a ${player.name}`);
      removeButton.textContent = "-";
      removeButton.addEventListener("click", () => {
        removePlayerFromLobby(player.id);
      });
      li.appendChild(removeButton);
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
// Votazo
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

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.textContent = `${option.letter}. ${option.text}`;

    button.addEventListener("click", () => {
      submitFriendVote(option.id, button);
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

function submitFriendVote(optionId, selectedButton) {
  if (!currentGame) return;

  selectedButton.classList.add("selected");
  disableFriendButtons();

  friendAnswerStatus.textContent = "Voto enviado. Esperando resultados...";

  socket.emit("submit_friend_vote", { pin: currentGame.pin, optionId }, (response) => {
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

  friendResultTitle.textContent = data.question;

  isLeader = data.game && data.game.leaderId === socket.id;

  if (isLeader) {
    friendResultLeaderControls.classList.remove("hidden");
  } else {
    friendResultLeaderControls.classList.add("hidden");
  }

  friendOptionsResultList.innerHTML = "";

  (data.options || []).forEach((option) => {
    const li = document.createElement("li");
    li.className = "votazo-option-result";

    const text = document.createElement("span");
    text.textContent = `${option.letter}. ${option.text}`;

    const count = document.createElement("strong");
    count.textContent = `${option.votes} voto${option.votes === 1 ? "" : "s"}`;

    if (option.isWinner) {
      li.classList.add("is-winner");
    }

    li.appendChild(text);
    li.appendChild(count);
    friendOptionsResultList.appendChild(li);
  });

  friendAnswersList.innerHTML = "";

  data.answers.forEach((answer) => {
    const li = document.createElement("li");
    li.className = "votazo-player-vote";

    const name = document.createElement("span");
    name.textContent = answer.playerName;

    const vote = document.createElement("strong");
    vote.className = `votazo-vote-letter ${answer.votedWinner ? "is-majority" : "is-minority"}`;
    vote.textContent = answer.selectedLetter || "-";

    li.appendChild(name);
    li.appendChild(vote);

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
    const passedLabel = data.playerId === socket.id ? "Pasaste" : "Pasado";
    headsWordText.textContent = `${passedLabel}: ${data.revealedWord}`;
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
  isLeader = data.game && data.game.leaderId === socket.id;

  if (isLeader) {
    headsResultLeaderControls.classList.remove("hidden");
  } else {
    headsResultLeaderControls.classList.add("hidden");
  }

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

  foundWordsList.innerHTML = "";
  wordStatusText.textContent = "";
  wordConnectLetters = [...wordState.letters];
  selectedWordLetterIndexes = [];
  wordConnectOpen = true;
  wordSubmissionPending = false;
  renderWordConnectControls();

  renderFoundWords(wordState.foundWords || []);
  renderRankingList(wordRankingList, wordState.ranking || []);

  startWordTimer(wordState.endAt, wordState.durationMs);

  showScreen(wordScreen);
}

function renderWordConnectControls() {
  wordLettersBox.innerHTML = "";
  wordComposer.innerHTML = "";

  const selectedIndexes = new Set(selectedWordLetterIndexes);

  wordConnectLetters.forEach((letter, index) => {
    const button = document.createElement("button");
    const isSelected = selectedIndexes.has(index);

    button.type = "button";
    button.className = "word-letter";
    button.textContent = letter;
    button.setAttribute("aria-label", `Agregar letra ${letter}`);
    button.setAttribute("aria-pressed", String(isSelected));
    button.classList.toggle("is-selected", isSelected);
    button.disabled = isSelected || !wordConnectOpen || wordSubmissionPending;

    button.addEventListener("click", () => {
      if (!wordConnectOpen || wordSubmissionPending || selectedIndexes.has(index)) return;

      selectedWordLetterIndexes.push(index);
      wordStatusText.textContent = "";
      renderWordConnectControls();
    });

    wordLettersBox.appendChild(button);
  });

  selectedWordLetterIndexes.forEach((letterIndex, selectedPosition) => {
    const letter = wordConnectLetters[letterIndex];
    const button = document.createElement("button");

    button.type = "button";
    button.className = "word-composer-letter";
    button.textContent = letter;
    button.setAttribute("aria-label", `Quitar letra ${letter}`);
    button.disabled = !wordConnectOpen || wordSubmissionPending;

    button.addEventListener("click", () => {
      if (!wordConnectOpen || wordSubmissionPending) return;

      selectedWordLetterIndexes.splice(selectedPosition, 1);
      wordStatusText.textContent = "";
      renderWordConnectControls();
    });

    wordComposer.appendChild(button);
  });

  submitWordBtn.disabled =
    !wordConnectOpen || wordSubmissionPending || selectedWordLetterIndexes.length === 0;
}

function clearWordComposer() {
  selectedWordLetterIndexes = [];
  renderWordConnectControls();
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
      wordConnectOpen = false;
      wordSubmissionPending = false;
      renderWordConnectControls();
      wordStatusText.textContent = "Tiempo terminado.";
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 100);
}

function submitWordConnectWord() {
  if (!currentGame) return;

  const word = selectedWordLetterIndexes
    .map((index) => wordConnectLetters[index])
    .join("");

  if (!word) {
    showToast("Selecciona las letras de la palabra.");
    return;
  }

  wordSubmissionPending = true;
  renderWordConnectControls();

  socket.emit("submit_word_connect_word", { pin: currentGame.pin, word }, (response) => {
    wordSubmissionPending = false;

    if (!response.ok) {
      wordStatusText.textContent = response.message || "Palabra inválida.";
      clearWordComposer();
      return;
    }

    wordStatusText.textContent = `+${response.word.points} pts por ${response.word.word}`;
    clearWordComposer();

    renderFoundWords(response.foundWords || []);
    renderRankingList(wordRankingList, response.ranking || []);
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
  isLeader = data.game && data.game.leaderId === socket.id;

  if (isLeader) {
    wordResultLeaderControls.classList.remove("hidden");
  } else {
    wordResultLeaderControls.classList.add("hidden");
  }

  showScreen(wordResultScreen);
}

// --------------------------------------------------
// STOP
// --------------------------------------------------

function renderStopIntro(game) {
  isLeader = game.leaderId === socket.id;

  if (isLeader) {
    startStopBtn.classList.remove("hidden");
    stopIntroWaitingText.classList.add("hidden");
  } else {
    startStopBtn.classList.add("hidden");
    stopIntroWaitingText.classList.remove("hidden");
  }

  showScreen(stopIntroScreen);
}

function renderStopLetterSelection(data) {
  clearInterval(stopLetterInterval);
  clearInterval(timerInterval);

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  stopLetterDisplay.classList.remove("is-selected");
  stopLetterStatus.textContent = "Seleccionando letra...";
  stopLetterDisplay.textContent = letters[Math.floor(Math.random() * letters.length)];

  stopLetterInterval = setInterval(() => {
    stopLetterDisplay.textContent = letters[Math.floor(Math.random() * letters.length)];
  }, 90);

  const remaining = Math.max(0, data.endAt - Date.now());

  setTimeout(() => {
    if (stopLetterInterval && Date.now() >= data.endAt) {
      clearInterval(stopLetterInterval);
      stopLetterInterval = null;
      stopLetterDisplay.textContent = "...";
    }
  }, remaining + 30);

  showScreen(stopLetterScreen);
}

function renderStopLetterRevealed(data) {
  clearInterval(stopLetterInterval);
  stopLetterInterval = null;
  stopLetterDisplay.textContent = data.letter;
  stopLetterDisplay.classList.add("is-selected");
  stopLetterStatus.textContent =
    `${data.listName} · ${data.totalCategories} categorías`;
  showScreen(stopLetterScreen);
}

function startStopTimer(endAt, durationMs, textElement, fillElement, onEnd) {
  clearInterval(timerInterval);

  function updateTimer() {
    const remaining = Math.max(0, endAt - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const percent = Math.max(0, Math.min(100, (remaining / durationMs) * 100));

    textElement.textContent = `${seconds}s`;
    fillElement.style.width = `${percent}%`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      onEnd();
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 100);
}

function renderStopCategoryPrompt(prompt) {
  stopAnswerPending = false;
  stopCategoryCounter.textContent = `Categoría ${prompt.number}/${prompt.total}`;
  stopAnswerLetter.textContent = prompt.letter;
  stopCategoryText.textContent = prompt.category;
  stopAnswerInput.value = "";
  stopAnswerInput.placeholder = `Palabra con ${prompt.letter}`;
  stopAnswerInput.dataset.categoryIndex = String(prompt.categoryIndex);
  stopAnswerInput.disabled = false;
  passStopAnswerBtn.disabled = false;
  submitStopAnswerBtn.disabled = true;
  stopAnswerStatus.textContent = "";

  startStopTimer(
    prompt.endAt,
    prompt.durationMs,
    stopAnswerTimerText,
    stopAnswerTimerFill,
    () => {
      stopAnswerInput.disabled = true;
      passStopAnswerBtn.disabled = true;
      submitStopAnswerBtn.disabled = true;
      stopAnswerStatus.textContent = "Tiempo terminado. Pasando a la siguiente categoría...";
    }
  );

  showScreen(stopAnswerScreen);
}

function submitStopAnswer(passed) {
  if (!currentGame || stopAnswerPending) return;

  const word = stopAnswerInput.value.trim();
  const categoryIndex = Number(stopAnswerInput.dataset.categoryIndex);

  if (!passed && !word) return;

  stopAnswerPending = true;
  stopAnswerInput.disabled = true;
  passStopAnswerBtn.disabled = true;
  submitStopAnswerBtn.disabled = true;
  stopAnswerStatus.textContent = passed ? "Pasando..." : "Enviando...";

  socket.emit("submit_stop_answer", {
    pin: currentGame.pin,
    word,
    passed,
    categoryIndex
  }, (response) => {
    if (response.ok) return;
    if (Number(stopAnswerInput.dataset.categoryIndex) !== categoryIndex) return;

    stopAnswerPending = false;
    stopAnswerInput.disabled = false;
    passStopAnswerBtn.disabled = false;
    submitStopAnswerBtn.disabled = !stopAnswerInput.value.trim();
    stopAnswerStatus.textContent = response.message || "No se pudo enviar la respuesta.";
  });
}

function renderStopVoteItem(vote) {
  clearInterval(timerInterval);
  stopVotePending = false;
  stopVoteCounter.textContent = `Palabra ${vote.number}/${vote.total}`;
  stopVoteCategory.textContent = `${vote.category} · Letra ${vote.letter}`;
  stopVotePlayer.textContent = `Respuesta de ${vote.playerName}`;
  stopVoteWord.textContent = vote.word;
  rejectStopVoteBtn.disabled = false;
  acceptStopVoteBtn.disabled = false;

  if (vote.canVote && !vote.hasVoted) {
    stopVoteControls.classList.remove("hidden");
    stopVoteStatus.textContent = "¿Se acepta esta palabra?";
  } else {
    stopVoteControls.classList.add("hidden");
    stopVoteStatus.textContent = vote.isAuthor
      ? "Los demás jugadores están votando tu palabra."
      : "Voto enviado. Esperando a los demás...";
  }

  startStopTimer(
    vote.endAt,
    vote.durationMs,
    stopVoteTimerText,
    stopVoteTimerFill,
    () => {
      stopVoteControls.classList.add("hidden");
      stopVoteStatus.textContent = "Votación cerrada.";
    }
  );

  showScreen(stopVotingScreen);
}

function submitStopVote(accept) {
  if (!currentGame || stopVotePending) return;

  stopVotePending = true;
  rejectStopVoteBtn.disabled = true;
  acceptStopVoteBtn.disabled = true;
  stopVoteStatus.textContent = "Voto enviado. Esperando a los demás...";

  socket.emit("submit_stop_vote", {
    pin: currentGame.pin,
    accept
  }, (response) => {
    if (response.ok) return;

    stopVotePending = false;
    rejectStopVoteBtn.disabled = false;
    acceptStopVoteBtn.disabled = false;
    stopVoteStatus.textContent = response.message || "No se pudo enviar el voto.";
  });
}

function renderStopVoteResult(result) {
  clearInterval(timerInterval);
  stopVoteControls.classList.add("hidden");
  stopVoteCounter.textContent = `Palabra ${result.number}/${result.total}`;
  stopVoteTimerText.textContent = "";
  stopVoteTimerFill.style.width = "0%";
  stopVoteCategory.textContent = `${result.category} · Letra ${result.letter}`;
  stopVotePlayer.textContent = `Respuesta de ${result.playerName}`;
  stopVoteWord.textContent = result.word;
  stopVoteStatus.textContent = result.accepted
    ? `Aceptada · ${result.acceptVotes} a favor`
    : `Rechazada · ${result.rejectVotes} en contra`;
  showScreen(stopVotingScreen);
}

function renderStopResult(data) {
  clearInterval(timerInterval);
  isLeader = data.game && data.game.leaderId === socket.id;

  stopResultTitle.textContent = `Letra ${data.letter} · ${data.listName}`;
  stopResultLeaderControls.classList.toggle("hidden", !isLeader);
  stopPlayerResultsList.innerHTML = "";

  data.playerResults.forEach((result) => {
    const li = document.createElement("li");
    li.className = "stop-result-row";

    const text = document.createElement("span");
    text.textContent = `${result.playerName} · ${result.submittedCount} enviadas`;

    const count = document.createElement("strong");
    count.className = "stop-result-count";
    count.textContent = `${result.acceptedCount} aceptadas`;

    li.appendChild(text);
    li.appendChild(count);
    stopPlayerResultsList.appendChild(li);
  });

  stopVoteResultsList.innerHTML = "";

  if (!data.voteResults.length) {
    const li = document.createElement("li");
    li.textContent = "No se enviaron palabras para revisar.";
    stopVoteResultsList.appendChild(li);
  }

  data.voteResults.forEach((result) => {
    const li = document.createElement("li");
    li.className = "stop-vote-result-row";

    const text = document.createElement("span");
    text.textContent = `${result.category}: ${result.word} · ${result.playerName}`;

    const decision = document.createElement("strong");
    decision.className =
      `stop-vote-decision ${result.accepted ? "is-accepted" : "is-rejected"}`;
    decision.textContent = result.accepted ? "Aceptada" : "Rechazada";

    li.appendChild(text);
    li.appendChild(decision);
    stopVoteResultsList.appendChild(li);
  });

  renderRankingList(stopFinalRankingList, data.ranking || []);
  showScreen(stopResultScreen);
}

// --------------------------------------------------
// ÚLTIMA CARTA
// --------------------------------------------------

const LAST_CARD_COLOR_NAMES = {
  red: "Rojo",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  wild: "Color libre"
};

function renderImpostorIntro(game) {
  isLeader = game.leaderId === socket.id;
  startImpostorBtn.classList.toggle("hidden", !isLeader);
  impostorIntroWaitingText.classList.toggle("hidden", isLeader);
  startImpostorBtn.disabled = false;
  showScreen(impostorIntroScreen);
}

function renderImpostorRole(role) {
  impostorRolePanel.classList.toggle("is-impostor", role.isImpostor);
  impostorRolePanel.classList.toggle("is-hidden-role", role.ready);
  impostorReadyBtn.classList.toggle("hidden", role.ready || !role.isActive);
  impostorReadyBtn.disabled = false;

  if (!role.isActive) {
    impostorRoleLabel.textContent = "Estás observando";
    impostorRoleValue.textContent = "Fuera de la ronda";
    impostorRoleHint.textContent = "Espera a que comience la votación.";
  } else if (role.isImpostor) {
    impostorRoleLabel.textContent = "Tu rol es";
    impostorRoleValue.textContent = "Eres el impostor";
    impostorRoleHint.textContent = "Escucha al grupo y trata de pasar desapercibido.";
  } else {
    impostorRoleLabel.textContent = "Tu palabra es";
    impostorRoleValue.textContent = role.word;
    impostorRoleHint.textContent = "Recuerda la palabra y no la muestres a nadie.";
  }

  impostorRoleStatus.textContent = role.ready
    ? `Listos: ${role.readyCount}/${role.totalPlayers}. Esperando a los demás...`
    : "Cuando memorices tu rol, pulsa Listo para ocultarlo.";
  showScreen(impostorRoleScreen);
}

function renderImpostorVoting(voting) {
  isLeader = currentGame && currentGame.leaderId === socket.id;
  finishImpostorRoundBtn.disabled = false;
  impostorVotingLeaderControls.classList.toggle("hidden", !isLeader);
  impostorVotingTitle.textContent = `Ronda ${voting.roundNumber}: ¿quién es el impostor?`;
  impostorPlayersList.innerHTML = "";

  voting.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "impostor-vote-option";
    button.textContent = player.playerName;
    button.dataset.playerId = player.playerId;
    button.classList.toggle("is-selected", player.playerId === voting.selectedPlayerId);
    button.disabled = !voting.canVote || player.isSelf;

    if (player.isSelf) {
      button.title = "No puedes votar por ti";
    }

    button.addEventListener("click", () => {
      socket.emit("submit_impostor_vote", {
        pin: currentGame.pin,
        playerId: player.playerId
      }, (response) => {
        if (!response.ok) {
          showToast(response.message || "No se pudo enviar el voto.");
          return;
        }

        impostorPlayersList.querySelectorAll(".impostor-vote-option").forEach((option) => {
          option.classList.toggle("is-selected", option.dataset.playerId === response.selectedPlayerId);
        });
        impostorVoteStatus.textContent = `Votaste por ${player.playerName}.`;
      });
    });

    impostorPlayersList.appendChild(button);
  });

  if (voting.isEliminated) {
    impostorVoteStatus.textContent = "Fuiste eliminado. Puedes observar la votación.";
  } else if (voting.selectedPlayerId) {
    const selected = voting.players.find(
      (player) => player.playerId === voting.selectedPlayerId
    );
    impostorVoteStatus.textContent = selected ? `Votaste por ${selected.playerName}.` : "";
  } else {
    impostorVoteStatus.textContent = "Selecciona a un jugador.";
  }

  impostorVoteProgress.textContent =
    `Votos enviados: ${voting.submittedCount}/${voting.totalVoters}`;
  showScreen(impostorVotingScreen);
}

function renderImpostorResult(result) {
  isLeader = currentGame && currentGame.leaderId === socket.id;
  continueImpostorRoundBtn.disabled = false;
  impostorResultLeaderControls.classList.toggle("hidden", !isLeader);
  impostorRevealBox.classList.toggle("hidden", !result.isFinal);
  impostorFinalRanking.classList.toggle("hidden", !result.isFinal);
  impostorActivePlayersList.innerHTML = "";

  if (result.groupWasRight) {
    impostorResultTitle.textContent = "El grupo acertó";
    impostorResultText.textContent =
      `${result.eliminatedPlayerName} era el impostor. El grupo gana la partida.`;
  } else if (result.isFinal) {
    impostorResultTitle.textContent = "El impostor sobrevivió";
    impostorResultText.textContent =
      `${result.eliminatedPlayerName} no era el impostor. Solo quedan dos jugadores activos.`;
  } else {
    impostorResultTitle.textContent = `${result.eliminatedPlayerName} queda eliminado`;
    impostorResultText.textContent =
      `El grupo no acertó: ${result.eliminatedPlayerName} no era el impostor.`;
  }

  (result.activePlayers || []).forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.playerName;
    impostorActivePlayersList.appendChild(li);
  });

  impostorActiveTitle.textContent = result.isFinal
    ? "Jugadores que llegaron al final"
    : "Jugadores que siguen activos";

  if (result.isFinal) {
    impostorRevealName.textContent = result.impostorPlayerName;
    impostorRevealWord.textContent = `La palabra era: ${result.word}`;
    renderRankingList(impostorRankingList, result.ranking || []);
  }

  showScreen(impostorResultScreen);
}

const CACHO_DIE_SYMBOLS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const CACHO_FACE_NAMES = ["", "unos", "doses", "treses", "cuatros", "cincos", "seises"];

function createCachoDie(value, small = false) {
  const die = document.createElement("span");
  die.className = `cacho-die${small ? " is-small" : ""}`;
  die.textContent = CACHO_DIE_SYMBOLS[value] || String(value);
  die.setAttribute("aria-label", `Dado con ${value}`);
  return die;
}

function renderCachoIntro(game) {
  isLeader = game.leaderId === socket.id;
  startCachoBtn.classList.toggle("hidden", !isLeader);
  cachoIntroWaitingText.classList.toggle("hidden", isLeader);
  startCachoBtn.disabled = false;
  showScreen(cachoIntroScreen);
}

function getSuggestedCachoBid(state) {
  if (!state.currentBid) return { quantity: 1, face: 2 };

  if (state.currentBid.face === 1) {
    return {
      quantity: Math.min(state.totalDice, state.currentBid.quantity + 1),
      face: 1
    };
  }

  if (state.currentBid.face < 6) {
    return {
      quantity: state.currentBid.quantity,
      face: state.currentBid.face + 1
    };
  }

  return {
    quantity: Math.ceil(state.currentBid.quantity / 2),
    face: 1
  };
}

function renderCachoGame(state) {
  currentCachoState = state;
  cachoActionPending = false;
  cachoRoundText.textContent = `Ronda ${state.roundNumber}`;
  cachoTurnText.textContent = state.isYourTurn
    ? "Es tu turno"
    : `Turno de ${state.currentPlayerName}`;
  cachoStatusText.textContent = state.message || "";

  cachoPlayersList.innerHTML = "";
  state.players.forEach((player) => {
    const li = document.createElement("li");
    li.className = "cacho-player-row";
    li.classList.toggle("is-current", player.isCurrent);
    li.classList.toggle("is-eliminated", player.eliminated);

    const name = document.createElement("span");
    name.textContent = player.playerName;
    const count = document.createElement("strong");
    count.textContent = player.eliminated
      ? "Eliminado"
      : `${player.diceCount} dado${player.diceCount === 1 ? "" : "s"}`;

    li.appendChild(name);
    li.appendChild(count);
    cachoPlayersList.appendChild(li);
  });

  if (state.currentBid) {
    cachoCurrentBid.classList.remove("is-empty");
    cachoCurrentBidText.textContent =
      `${state.currentBid.quantity} ${CACHO_FACE_NAMES[state.currentBid.face]}`;
    cachoCurrentBidder.textContent = `Apuesta de ${state.currentBid.bidderName}`;
  } else {
    cachoCurrentBid.classList.add("is-empty");
    cachoCurrentBidText.textContent = "Sin apuesta";
    cachoCurrentBidder.textContent = "";
  }

  cachoDice.innerHTML = "";
  state.dice.forEach((value) => cachoDice.appendChild(createCachoDie(value)));

  if (!state.dice.length) {
    const empty = document.createElement("span");
    empty.className = "cacho-no-dice";
    empty.textContent = state.isEliminated ? "Estás observando la ronda." : "Preparando dados...";
    cachoDice.appendChild(empty);
  }

  const suggestion = getSuggestedCachoBid(state);
  selectedCachoFace = suggestion.face;
  cachoQuantityInput.min = "1";
  cachoQuantityInput.max = String(state.totalDice);
  cachoQuantityInput.value = String(suggestion.quantity);
  cachoControls.classList.toggle("hidden", !state.isYourTurn);

  if (state.isEliminated) {
    cachoStatusText.textContent = "Fuiste eliminado. Puedes observar la partida.";
  } else if (state.isYourTurn) {
    cachoStatusText.textContent = state.currentBid
      ? "Supera la apuesta o declara Dudo."
      : "Haz la primera apuesta de la ronda.";
  }

  startStopTimer(
    state.endAt,
    state.durationMs,
    cachoTimerText,
    cachoTimerFill,
    () => {
      cachoActionPending = true;
      cachoStatusText.textContent = "Tiempo terminado. Resolviendo el turno...";
      renderCachoControls();
    }
  );

  renderCachoControls();
  showScreen(cachoScreen);
}

function renderCachoControls() {
  if (!currentCachoState) return;

  const disabled = cachoActionPending || !currentCachoState.isYourTurn;
  cachoQuantityInput.disabled = disabled;
  submitCachoBidBtn.disabled = disabled;
  callCachoDoubtBtn.disabled = disabled || !currentCachoState.canDoubt;

  cachoFaceButtons.forEach((button) => {
    const face = Number(button.dataset.face);
    button.disabled = disabled;
    button.classList.toggle("is-selected", face === selectedCachoFace);
    button.setAttribute("aria-pressed", String(face === selectedCachoFace));
  });
}

function renderCachoResult(result) {
  clearInterval(timerInterval);
  currentCachoState = null;
  isLeader = currentGame && currentGame.leaderId === socket.id;
  continueCachoResultBtn.disabled = false;
  cachoResultLeaderControls.classList.toggle("hidden", !isLeader);
  cachoFinalRanking.classList.toggle("hidden", !result.isFinal);

  cachoResultTitle.textContent = result.isFinal
    ? `${result.winnerName} gana Cacho`
    : result.bidWasTrue
      ? "La apuesta era cierta"
      : "La apuesta era falsa";

  const challengePrefix = result.timedOut
    ? `${result.challengerName} agotó su tiempo y desafió`
    : `${result.challengerName} dudó de`;
  cachoResultSummary.textContent =
    `${challengePrefix} la apuesta de ${result.bidderName || result.bid.bidderName}.`;
  cachoCountResult.textContent =
    `Se apostaron ${result.bid.quantity} ${CACHO_FACE_NAMES[result.bid.face]} y había ${result.actualCount}.`;

  cachoRevealedDiceList.innerHTML = "";
  result.revealedPlayers.forEach((player) => {
    const li = document.createElement("li");
    li.className = "cacho-revealed-row";
    li.classList.toggle("lost-die", player.lostDie);

    const name = document.createElement("strong");
    name.textContent = player.playerName;
    const dice = document.createElement("div");
    dice.className = "cacho-revealed-dice";
    player.dice.forEach((value) => dice.appendChild(createCachoDie(value, true)));

    li.appendChild(name);
    li.appendChild(dice);
    cachoRevealedDiceList.appendChild(li);
  });

  cachoLoserText.textContent = result.loserEliminated
    ? `${result.loserName} perdió su último dado y quedó eliminado.`
    : `${result.loserName} perdió un dado y conserva ${result.loserDiceCount}.`;

  if (result.isFinal) {
    cachoResultSummary.textContent =
      `${result.winnerName} es la última persona con dados y suma ${result.winnerPoints} puntos.`;
    renderRankingList(cachoRankingList, result.ranking || []);
  }

  showScreen(cachoResultScreen);
}

function renderLastCardIntro(game) {
  isLeader = game.leaderId === socket.id;

  startLastCardBtn.classList.toggle("hidden", !isLeader);
  lastCardIntroWaitingText.classList.toggle("hidden", isLeader);
  showScreen(lastCardIntroScreen);
}

function createLastCardElement(card, interactive = false) {
  const element = document.createElement(interactive ? "button" : "div");
  const colorClass = card.color === "wild" ? "is-wild" : `is-${card.color}`;

  element.className = `last-card-card ${colorClass}`;
  element.classList.toggle("is-action", card.type !== "number");
  element.classList.toggle("is-playable", Boolean(card.playable));
  element.classList.toggle("is-drawn", card.id === currentLastCardState?.drawnCardId);

  const symbol = document.createElement("span");
  symbol.textContent = card.symbol;
  element.appendChild(symbol);

  if (interactive) {
    element.type = "button";
    element.disabled = lastCardActionPending || !card.playable;
    element.title = card.playable
      ? `Jugar ${card.symbol}`
      : `${card.symbol} no se puede jugar ahora`;
    element.setAttribute(
      "aria-label",
      `${card.symbol}, ${LAST_CARD_COLOR_NAMES[card.color] || card.color}`
    );

    element.addEventListener("click", () => {
      if (!card.playable || lastCardActionPending) return;

      if (card.color === "wild") {
        selectedWildCardId = card.id;
        lastCardColorPicker.classList.remove("hidden");
        return;
      }

      playLastCardCard(card.id, null);
    });
  }

  return element;
}

function renderLastCardGame(state) {
  currentLastCardState = state;
  lastCardActionPending = false;
  selectedWildCardId = null;
  lastCardColorPicker.classList.add("hidden");

  if (!state.canCallLastCard) {
    lastCardCalled = false;
  }

  callLastCardBtn.classList.toggle("is-called", lastCardCalled);
  callLastCardBtn.setAttribute("aria-pressed", String(lastCardCalled));
  lastCardTurnText.textContent = state.isYourTurn
    ? "Es tu turno"
    : `Turno de ${state.currentPlayerName}`;
  lastCardDirectionText.textContent = state.direction === 1
    ? "Sentido: horario"
    : "Sentido: antihorario";
  lastCardActiveColor.className = `last-card-color-swatch is-${state.currentColor}`;
  lastCardActiveColor.title = LAST_CARD_COLOR_NAMES[state.currentColor] || state.currentColor;
  lastCardDrawCount.textContent = `${state.drawPileCount} cartas`;
  lastCardStatusText.textContent = state.message || "";

  lastCardPlayersList.innerHTML = "";
  state.players.forEach((player) => {
    const li = document.createElement("li");
    li.className = "last-card-player";
    li.classList.toggle("is-current", player.isCurrent);

    const name = document.createElement("span");
    name.className = "last-card-player-name";
    name.textContent = player.playerName;

    const count = document.createElement("strong");
    count.className = "last-card-player-count";
    count.textContent = String(player.cardCount);
    count.title = `${player.cardCount} cartas`;

    li.appendChild(name);
    li.appendChild(count);
    lastCardPlayersList.appendChild(li);
  });

  lastCardTopCard.innerHTML = "";
  if (state.topCard) {
    lastCardTopCard.appendChild(createLastCardElement(state.topCard));
  }

  lastCardHand.innerHTML = "";
  state.hand.forEach((card) => {
    lastCardHand.appendChild(createLastCardElement(card, true));
  });

  startStopTimer(
    state.endAt,
    state.durationMs,
    lastCardTimerText,
    lastCardTimerFill,
    () => {
      lastCardActionPending = true;
      lastCardStatusText.textContent = "Tiempo terminado. Resolviendo el turno...";
      renderLastCardControls();
    }
  );

  renderLastCardControls();
  showScreen(lastCardScreen);
}

function renderLastCardControls() {
  if (!currentLastCardState) return;

  drawLastCardBtn.disabled = lastCardActionPending || !currentLastCardState.canDraw;
  passLastCardBtn.classList.toggle("hidden", !currentLastCardState.canPass);
  passLastCardBtn.disabled = lastCardActionPending || !currentLastCardState.canPass;
  callLastCardBtn.disabled =
    lastCardActionPending || !currentLastCardState.canCallLastCard;

  lastCardHand.querySelectorAll(".last-card-card").forEach((cardButton) => {
    cardButton.disabled = lastCardActionPending || !cardButton.classList.contains("is-playable");
  });
}

function playLastCardCard(cardId, chosenColor) {
  if (!currentGame || lastCardActionPending) return;

  lastCardActionPending = true;
  selectedWildCardId = null;
  lastCardColorPicker.classList.add("hidden");
  renderLastCardControls();

  socket.emit("play_last_card", {
    pin: currentGame.pin,
    cardId,
    chosenColor,
    calledLastCard: lastCardCalled
  }, (response) => {
    if (response.ok) return;

    lastCardActionPending = false;
    lastCardStatusText.textContent = response.message || "No se pudo jugar esa carta.";
    renderLastCardControls();
  });
}

function renderLastCardResult(data) {
  clearInterval(timerInterval);
  isLeader = data.game && data.game.leaderId === socket.id;

  lastCardResultLeaderControls.classList.toggle("hidden", !isLeader);
  lastCardWinnerText.textContent = `${data.winnerName} ganó la ronda`;
  lastCardRoundPointsText.textContent = `Sumó ${data.roundPoints} puntos.`;
  lastCardResultsList.innerHTML = "";

  data.playerResults.forEach((result) => {
    const li = document.createElement("li");
    li.className = "last-card-result-row";
    li.classList.toggle("is-winner", result.isWinner);

    const name = document.createElement("strong");
    name.textContent = result.playerName;

    const detail = document.createElement("span");
    detail.textContent = result.isWinner
      ? "Sin cartas"
      : `${result.remainingCards} cartas · ${result.remainingPoints} pts`;

    li.appendChild(name);
    li.appendChild(detail);
    lastCardResultsList.appendChild(li);
  });

  renderRankingList(lastCardFinalRankingList, data.ranking || []);
  showScreen(lastCardResultScreen);
}

function renderBetweenGamesScoreboard(data) {
  clearInterval(timerInterval);

  const finishedGameName = data.finishedGameName || "Juego";
  betweenGamesTitle.textContent = `Puntos actuales`;

  if (isLeader) {
    betweenGamesLeaderControls.classList.remove("hidden");
    betweenGamesSubtitle.textContent = data.hasNextGame
      ? `${finishedGameName} terminó. Toca Continuar para pasar al siguiente juego.`
      : `${finishedGameName} terminó. Toca Continuar para cerrar la partida.`;
  } else {
    betweenGamesLeaderControls.classList.add("hidden");
    betweenGamesSubtitle.textContent = data.hasNextGame
      ? `${finishedGameName} terminó. Esperando a que el líder continúe...`
      : `${finishedGameName} terminó. Esperando a que el líder cierre la partida...`;
  }

  renderRankingList(betweenGamesRankingList, data.ranking || []);

  showScreen(betweenGamesScreen);
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

  pokerInitialChipsInput.value = settings.initialChips;
  pokerSmallBlindInput.value = settings.smallBlind;
  pokerBigBlindInput.value = settings.bigBlind;
  pokerRoundsInput.value = settings.totalRounds;
  pokerSettingsHelp.textContent =
    `Ciegas: ${settings.smallBlind}/${settings.bigBlind}. Rondas: ${settings.totalRounds}.`;

  if (isLeader) {
    pokerSettingsSummary.classList.add("hidden");
    pokerLeaderSettings.classList.remove("hidden");
    pokerPlayerWaiting.classList.add("hidden");

    pokerInitialChipsInput.disabled = false;
    pokerSmallBlindInput.disabled = false;
    pokerBigBlindInput.disabled = false;
    pokerRoundsInput.disabled = false;
    savePokerSettingsBtn.disabled = false;
    startPokerBtn.disabled = false;
  } else {
    pokerSettingsSummary.classList.remove("hidden");
    pokerLeaderSettings.classList.add("hidden");
    pokerPlayerWaiting.classList.remove("hidden");
    pokerPlayerWaiting.textContent =
      "Configuración actual de la partida. Esperando a que el líder empiece Poker...";

    pokerInitialChipsInput.disabled = true;
    pokerSmallBlindInput.disabled = true;
    pokerBigBlindInput.disabled = true;
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
  pokerPotText.textContent = `Bote: ${pokerState.pot || 0}`;

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

  pokerCurrentChipsText.textContent = `${pokerState.yourChips || 0} fichas`;

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
