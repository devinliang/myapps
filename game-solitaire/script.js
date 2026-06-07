// --- 1. 全域狀態與設定 ---
const SUITS = [
  { name: 'spade', symbol: '♠', color: 'black' },
  { name: 'heart', symbol: '♥', color: 'red' },
  { name: 'diamond', symbol: '♦', color: 'red' },
  { name: 'club', symbol: '♣', color: 'black' }
];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // 1(A) 到 13(K)

let deck = [];
let gameState = {
  freeCells: [null, null, null, null],
  foundations: { spade: 0, heart: 0, diamond: 0, club: 0 },
  tableau: [[], [], [], [], [], [], [], []]
};

let selectedOrigin = null; // 紀錄被選取的牌來源 { type: 'tableau'|'free', index: 0~7 }
let moveCount = 0;

// --- 2. 初始化與發牌 ---
function initGame() {
  deck = [];
  moveCount = 0;
  selectedOrigin = null;
  document.getElementById('move-count').textContent = `步數: ${moveCount}`;
  
  // 初始化狀態
  gameState.freeCells = [null, null, null, null];
  gameState.foundations = { spade: 0, heart: 0, diamond: 0, club: 0 };
  gameState.tableau = [[], [], [], [], [], [], [], []];

  // 1. 產生 52 張牌
  SUITS.forEach(suit => {
    VALUES.forEach(val => {
      deck.push({ suit: suit.name, symbol: suit.symbol, color: suit.color, value: val });
    });
  });

  // 2. 洗牌 (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // 3. 發牌到 8 個工作區
  deck.forEach((card, index) => {
    gameState.tableau[index % 8].push(card);
  });

  render();
}

// --- 3. 畫面渲染 (DOM 產生) ---
function render() {
  // A. 渲染工作區 (Tableau)
  const tableauEl = document.getElementById('tableau');
  tableauEl.innerHTML = '';
  
  gameState.tableau.forEach((column, colIdx) => {
    const colDiv = document.createElement('div');
    colDiv.className = 'column';
    colDiv.dataset.type = 'tableau';
    colDiv.dataset.index = colIdx;

    column.forEach((card, cardIdx) => {
      const cardDiv = document.createElement('div');
      cardDiv.className = `card ${card.color}`;
      // 用 CSS top 屬性做出覆蓋重疊效果
      cardDiv.style.top = `${cardIdx * 30}px`; 
      cardDiv.innerHTML = `<div>${getCardDisplay(card.value)}${card.symbol}</div>`;
      
      // 只有最下方的牌才能被點擊
      if (cardIdx === column.length - 1) {
        cardDiv.addEventListener('click', (e) => {
          e.stopPropagation(); // 防止觸發行的點擊事件
          handleCardClick('tableau', colIdx);
        });
      }

      // 如果這張牌剛好是被選取的牌
      if (selectedOrigin && selectedOrigin.type === 'tableau' && selectedOrigin.index === colIdx && cardIdx === column.length - 1) {
        cardDiv.classList.add('selected');
      }

      colDiv.appendChild(cardDiv);
    });

    // 當工作區這行是空的時候，點擊空行可以把牌移過來
    if (column.length === 0) {
      colDiv.addEventListener('click', () => handleCardClick('tableau', colIdx));
    }

    tableauEl.appendChild(colDiv);
  });

  // B. 渲染暫存區 (Free Cells)
  const freeCellEls = document.querySelectorAll('.free-cell');
  gameState.freeCells.forEach((card, idx) => {
    const cell = freeCellEls[idx];
    cell.innerHTML = '';
    if (card) {
      const cardDiv = document.createElement('div');
      cardDiv.className = `card ${card.color}`;
      cardDiv.innerHTML = `<div>${getCardDisplay(card.value)}${card.symbol}</div>`;
      
      if (selectedOrigin && selectedOrigin.type === 'free' && selectedOrigin.index === idx) {
        cardDiv.classList.add('selected');
      }

      cardDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardClick('free', idx);
      });
      cell.appendChild(cardDiv);
    }
  });

  // C. 渲染結算區 (Foundations)
  const foundEls = document.querySelectorAll('.foundation');
  foundEls.forEach(cell => {
    const suit = cell.dataset.suit;
    const val = gameState.foundations[suit];
    const suitObj = SUITS.find(s => s.name === suit);
    if (val > 0) {
      cell.innerHTML = `<div class="card ${suitObj.color}">${getCardDisplay(val)}${suitObj.symbol}</div>`;
    } else {
      cell.innerHTML = suitObj.symbol;
    }
  });
}

function getCardDisplay(val) {
  if (val === 1) return 'A';
  if (val === 11) return 'J';
  if (val === 12) return 'Q';
  if (val === 13) return 'K';
  return val;
}

// --- 4. 核心點擊控制邏輯 (核心控制) ---
function handleCardClick(type, index) {
  // 情況一：尚未選取任何牌
  if (!selectedOrigin) {
    if (type === 'tableau' && gameState.tableau[index].length === 0) return;
    if (type === 'free' && !gameState.freeCells[index]) return;
    
    selectedOrigin = { type, index };
    render();
    return;
  }

  // 情況二：已經選取了一張牌，現在點擊「目標位置」
  const movingCard = getMovingCard(selectedOrigin);
  
  if (!movingCard) {
    selectedOrigin = null;
    render();
    return;
  }

  // 如果點擊同一個地方，取消選取
  if (selectedOrigin.type === type && selectedOrigin.index === index) {
    selectedOrigin = null;
    render();
    return;
  }

  // 驗證是否可以移動
  let canMove = false;

  if (type === 'tableau') {
    const targetCol = gameState.tableau[index];
    if (targetCol.length === 0) {
      canMove = true; // 空行可以放任何單張牌
    } else {
      const topCard = targetCol[targetCol.length - 1];
      // 規則：點擊目標點數必須大 1，且顏色相反
      if (topCard.value === movingCard.value + 1 && topCard.color !== movingCard.color) {
        canMove = true;
      }
    }
  } else if (type === 'free') {
    if (!gameState.freeCells[index]) {
      canMove = true; // 暫存區是空的就能放
    }
  }

  // 執行移動
  if (canMove) {
    executeMove(selectedOrigin, { type, index });
    moveCount++;
    document.getElementById('move-count').textContent = `步數: ${moveCount}`;
    checkAutoCollect(); // 每次移動完嘗試自動收牌到結算區
  }

  selectedOrigin = null;
  render();
}

// 取得當前欲移動的牌物件
function getMovingCard(origin) {
  if (origin.type === 'tableau') {
    const col = gameState.tableau[origin.index];
    return col[col.length - 1];
  } else if (origin.type === 'free') {
    return gameState.freeCells[origin.index];
  }
  return null;
}

// 變更資料狀態
function executeMove(from, to) {
  let card;
  if (from.type === 'tableau') card = gameState.tableau[from.index].pop();
  else if (from.type === 'free') {
    card = gameState.freeCells[from.index];
    gameState.freeCells[from.index] = null;
  }

  if (to.type === 'tableau') gameState.tableau[to.index].push(card);
  else if (to.type === 'free') gameState.freeCells[to.index] = card;
}

// --- 5. 自動結算與判定區監聽 ---
function checkAutoCollect() {
  let changed = false;
  
  // 檢查工作區最下方的牌
  gameState.tableau.forEach((col, idx) => {
    if (col.length > 0) {
      const card = col[col.length - 1];
      if (canMoveToFoundation(card)) {
        gameState.foundations[card.suit] = card.value;
        col.pop();
        changed = true;
      }
    }
  });

  // 檢查暫存區的牌
  gameState.freeCells.forEach((card, idx) => {
    if (card && canMoveToFoundation(card)) {
      gameState.foundations[card.suit] = card.value;
      gameState.freeCells[idx] = null;
      changed = true;
    }
  });

  // 如果有成功自動收牌，再跑一次檢查（連鎖反應）
  if (changed) {
    render();
    checkAutoCollect();
  }
}

function canMoveToFoundation(card) {
  const currentVal = gameState.foundations[card.suit];
  return card.value === currentVal + 1;
}

// 監聽結算區的點擊（手動把選取的牌推入結算區）
document.querySelectorAll('.foundation').forEach(cell => {
  cell.addEventListener('click', () => {
    if (!selectedOrigin) return;
    const suit = cell.dataset.suit;
    const movingCard = getMovingCard(selectedOrigin);
    
    if (movingCard && movingCard.suit === suit && canMoveToFoundation(movingCard)) {
      gameState.foundations[suit] = movingCard.value;
      if (selectedOrigin.type === 'tableau') gameState.tableau[selectedOrigin.index].pop();
      if (selectedOrigin.type === 'free') gameState.freeCells[selectedOrigin.index] = null;
      
      moveCount++;
      document.getElementById('move-count').textContent = `步數: ${moveCount}`;
      selectedOrigin = null;
      render();
      checkAutoCollect();
    }
  });
});

// 重來按鈕
document.getElementById('btn-restart').addEventListener('click', initGame);

// 啟動遊戲
initGame();