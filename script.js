const winModal = document.getElementById("winModal");
const modalMoves = document.getElementById("modalMoves");
const modalTime = document.getElementById("modalTime");
const playAgainBtn = document.getElementById("playAgainBtn");

// --- Configuration ---
const EMOJIS = [
  "🍉",
  "🍓",
  "🍌",
  "🍇",
  "🍒",
  "🍍",
  "🥝",
  "🍑",
  "🥥",
  "🥭",
  "🍋",
  "🍊",
];
// Pick how many unique pairs to use (max EMOJIS.length). Adjust grid at CSS breakpoints.
const PAIRS = 8; // 8 pairs => 16 cards

// --- DOM refs ---
const board = document.getElementById("board");
const movesEl = document.getElementById("moves");
const timeEl = document.getElementById("time");
const restartBtn = document.getElementById("restart");
const bestEl = document.getElementById("best");

// --- State ---
let deck = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matches = 0;
let timerInterval = null;
let startTime = null;

// Best stored as JSON {moves: number, timeMs: number}
const BEST_KEY = "memory_best";

function formatTime(ms) {
  if (!ms) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function loadBest() {
  try {
    const json = localStorage.getItem(BEST_KEY);
    if (!json) {
      bestEl.textContent = "—";
      return null;
    }
    const b = JSON.parse(json);
    bestEl.textContent = `${b.moves} moves • ${formatTime(b.timeMs)}`;
    return b;
  } catch (e) {
    return null;
  }
}
loadBest();

function saveBest(candidate) {
  const current = (() => {
    try {
      return JSON.parse(localStorage.getItem(BEST_KEY));
    } catch (e) {
      return null;
    }
  })();
  // Better if fewer moves, or tie moves but less time
  if (
    !current ||
    candidate.moves < current.moves ||
    (candidate.moves === current.moves && candidate.timeMs < current.timeMs)
  ) {
    localStorage.setItem(BEST_KEY, JSON.stringify(candidate));
    loadBest();
  }
}

function shuffleArray(a) {
  // Fisher-Yates
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck() {
  const choices = EMOJIS.slice(0, PAIRS);
  const pairDeck = choices.concat(choices); // duplicate
  return shuffleArray(
    pairDeck.map((sym, idx) => ({ id: idx + "-" + sym, sym }))
  );
}

function createCardElement(cardData) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.sym = cardData.sym;
  card.dataset.id = cardData.id;

  card.innerHTML = `
        <div class="card-inner" aria-hidden="false">
          <div class="card-face back">
            <div style="font-size:22px">${cardData.sym}</div>
            <div class="small">Memory</div>
          </div>
          <div class="card-face front"></div>
        </div>
      `;
  card.addEventListener("click", onCardClick);
  return card;
}

function renderBoard() {
  board.innerHTML = "";
  deck.forEach((d) => board.appendChild(createCardElement(d)));
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    timeEl.textContent = formatTime(elapsed);
  }, 250);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function resetGame() {
  stopTimer();
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matches = 0;
  movesEl.textContent = moves;
  timeEl.textContent = "00:00";
  deck = buildDeck();
  renderBoard();
}

function onCardClick(e) {
  const card = e.currentTarget;
  if (lockBoard) return;
  if (card === firstCard) return; // clicked same card

  // Start timer at first interaction
  if (moves === 0 && !timerInterval) startTimer();

  flipCard(card);

  if (!firstCard) {
    firstCard = card;
    return;
  }
  secondCard = card;
  lockBoard = true;
  moves += 1;
  movesEl.textContent = moves;

  checkForMatch();
}

function flipCard(card) {
  card.classList.add("flip");
  // show symbol on front for screen readers and if needed
  const front = card.querySelector(".front");
  front.textContent = card.dataset.sym;
}

function unflip(card) {
  card.classList.remove("flip");
  const front = card.querySelector(".front");
  front.textContent = "";
}

function checkForMatch() {
  const isMatch = firstCard.dataset.sym === secondCard.dataset.sym;
  if (isMatch) {
    // keep them flipped and mark matched
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");
    // prevent further clicks
    firstCard.removeEventListener("click", onCardClick);
    secondCard.removeEventListener("click", onCardClick);
    matches += 1;
    resetSelections();
    if (matches === PAIRS) onWin();
  } else {
    // wait and flip back
    setTimeout(() => {
      unflip(firstCard);
      unflip(secondCard);
      resetSelections();
    }, 700);
  }
}

function resetSelections() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function onWin() {
  stopTimer();

  const timeMs = Date.now() - startTime;

  // update modal
  modalMoves.textContent = moves;
  modalTime.textContent = formatTime(timeMs);
  winModal.classList.remove("hidden");

  // SAVE BEST SCORE
  saveBest({ moves, timeMs });
}

// wire restart
restartBtn.addEventListener("click", () => {
  resetGame();
});

//Play again logiv
playAgainBtn.addEventListener("click", () => {
  winModal.classList.add("hidden");
  resetGame();
});

// initialize
resetGame();
