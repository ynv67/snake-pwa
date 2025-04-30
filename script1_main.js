let canvas, ctx;
let gridSize = 15;
let snake, direction, food, score, gameOver;
let intervalId;
let gameSpeed = 170;
let obstacles = [];
let startX, startY;

function initializeCanvas() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
}

function startGame() {
  if (!canvas || !ctx) initializeCanvas();

  snake = [{ x: 5, y: 5 }];
  direction = 'right';
  score = 0;
  gameOver = false;
  food = generateRandomPosition();
  obstacles = [];
  updateScore();

  const difficulty = document.getElementById('difficulty').value;
  gameSpeed = difficulty === 'normal' ? 170 : difficulty === 'hard' ? 100 : 60;

  const mode = document.getElementById('mode').value;
  if (mode === 'obstacle') {
    for (let i = 0; i < 10; i++) {
      obstacles.push(generateRandomPosition());
    }
  }

  const theme = document.getElementById('theme').value;
  document.body.className = theme + '-theme';

  clearInterval(intervalId);
  intervalId = setInterval(gameLoop, gameSpeed);

  document.getElementById('restartBtn').style.display = 'none';
  document.getElementById('bgm').play();
}

function setDirection(dir) {
  const opposites = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  };
  if (direction !== opposites[dir]) direction = dir;
}

function generateRandomPosition() {
  return {
    x: Math.floor(Math.random() * (canvas.width / gridSize)),
    y: Math.floor(Math.random() * (canvas.height / gridSize))
  };
}

function updateScore() {
  document.getElementById('score').textContent = score;
}

function gameLoop() {
  if (gameOver) return;

  let head = { ...snake[0] };
  if (direction === 'up') head.y--;
  if (direction === 'down') head.y++;
  if (direction === 'left') head.x--;
  if (direction === 'right') head.x++;

  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= canvas.width / gridSize ||
    head.y >= canvas.height / gridSize ||
    snake.some(seg => seg.x === head.x && seg.y === head.y) ||
    obstacles.some(obs => obs.x === head.x && obs.y === head.y)
  ) {
    gameOver = true;
    document.getElementById('gameOverSound').play();
    alert('게임 오버! 점수: ' + score);
    document.getElementById('restartBtn').style.display = 'block';
    document.getElementById('bgm').pause();
    saveRanking(score);
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    food = generateRandomPosition();
    document.getElementById('eatSound').play();
  } else {
    snake.pop();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = document.getElementById('snakeColor').value || 'lime';
  snake.forEach(seg => {
    ctx.fillRect(seg.x * gridSize, seg.y * gridSize, gridSize - 1, gridSize - 1);
  });

  ctx.fillStyle = 'red';
  ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 1, gridSize - 1);

  ctx.fillStyle = 'gray';
  obstacles.forEach(obs => {
    ctx.fillRect(obs.x * gridSize, obs.y * gridSize, gridSize - 1, gridSize - 1);
  });

  updateScore();
}

function saveRanking(score) {
  const request = indexedDB.open('SnakeGameDB', 1);
  request.onupgradeneeded = function (e) {
    let db = e.target.result;
    if (!db.objectStoreNames.contains('ranking')) {
      db.createObjectStore('ranking', { keyPath: 'time' });
    }
  };
  request.onsuccess = function (e) {
    let db = e.target.result;
    let tx = db.transaction('ranking', 'readwrite');
    let store = tx.objectStore('ranking');
    store.add({ score, time: Date.now() });
    tx.oncomplete = () => loadRanking();
  };
}

function loadRanking() {
  const request = indexedDB.open('SnakeGameDB', 1);
  request.onsuccess = function (e) {
    let db = e.target.result;
    let tx = db.transaction('ranking', 'readonly');
    let store = tx.objectStore('ranking');
    let items = [];
    store.openCursor(null, 'prev').onsuccess = function (e) {
      let cursor = e.target.result;
      if (cursor && items.length < 10) {
        items.push(cursor.value);
        cursor.continue();
      } else {
        const list = document.getElementById('rankingList');
        list.innerHTML = '';
        items.forEach(item => {
          const li = document.createElement('li');
          li.textContent = `${item.score}점`;
          list.appendChild(li);
        });
      }
    };
  };
}

window.addEventListener('DOMContentLoaded', () => {
  initializeCanvas();
  loadRanking();

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);

  // 안전하게 이벤트 바인딩: canvas가 null이 아닐 때만
  document.getElementById('game').addEventListener('touchstart', e => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  });

  document.getElementById('game').addEventListener('touchend', e => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) setDirection('right');
      else if (dx < -30) setDirection('left');
    } else {
      if (dy > 30) setDirection('down');
      else if (dy < -30) setDirection('up');
    }
  });
});
