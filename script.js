const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const diamondDisplay = document.getElementById("diamonds");
const levelDisplay = document.getElementById("level");
const highScoreDisplay = document.getElementById("highScore");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const pauseScreen = document.getElementById("pauseScreen");

const finalScore = document.getElementById("finalScore");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const soundBtn = document.getElementById("soundBtn");

let width = 800;
let height = 450;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    width = rect.width;
    height = rect.height;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

// GAME VARIABLES

let gameRunning = false;
let gamePaused = false;
let score = 0;
let diamonds = 0;
let level = 1;

let highScore = Number(localStorage.getItem("neonHighScore")) || 0;

highScoreDisplay.textContent = highScore;

let obstacles = [];
let gems = [];
let particles = [];
let stars = [];

let speed = 3;
let spawnTimer = 0;
let gemTimer = 0;

let keys = {
    left: false,
    right: false
};

let soundEnabled = true;

let animationId;

// PLAYER

const player = {
    x: 0,
    y: 0,
    width: 32,
    height: 38,
    speed: 6
};

// SOUND EFFECTS

let audioContext;

function playSound(frequency, duration = 0.1) {
    if (!soundEnabled) return;

    try {
        audioContext ??= new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = "sine";

        gain.gain.setValueAtTime(0.08, audioContext.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);

    } catch (error) {
        console.log("Audio unavailable");
    }
}

// STARS

function createStars() {
    stars = [];

    for (let i = 0; i < 90; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2,
            speed: Math.random() * 1.5 + 0.3
        });
    }
}

// RESET GAME

function resetGame() {

    score = 0;
    diamonds = 0;
    level = 1;

    speed = 3;

    obstacles = [];
    gems = [];
    particles = [];

    spawnTimer = 0;
    gemTimer = 0;

    player.x = width / 2 - player.width / 2;
    player.y = height - 75;

    scoreDisplay.textContent = "0000";
    diamondDisplay.textContent = "💎 0";
    levelDisplay.textContent = "01";

    keys.left = false;
    keys.right = false;

    createStars();
}

// DRAW BACKGROUND

function drawBackground() {

    const gradient = ctx.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#09091e");
    gradient.addColorStop(1, "#151533");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Stars

    stars.forEach(star => {

        ctx.fillStyle = "rgba(255,255,255,0.7)";

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        if (gameRunning && !gamePaused) {
            star.y += star.speed;

            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * width;
            }
        }

    });

    // Moving neon grid

    ctx.strokeStyle = "rgba(0,234,255,0.12)";
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 50) {

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

    }

    for (let y = 0; y < height; y += 50) {

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

    }

}

// DRAW PLAYER

function drawPlayer() {

    const x = player.x;
    const y = player.y;

    ctx.save();

    ctx.shadowColor = "#00eaff";
    ctx.shadowBlur = 25;

    // Player body

    const gradient = ctx.createLinearGradient(
        x,
        y,
        x,
        y + player.height
    );

    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.4, "#00eaff");
    gradient.addColorStop(1, "#5445ff");

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.moveTo(x + player.width / 2, y);
    ctx.lineTo(x + player.width, y + player.height);
    ctx.lineTo(x + player.width / 2, y + player.height - 9);
    ctx.lineTo(x, y + player.height);

    ctx.closePath();
    ctx.fill();

    // Player center

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();

    ctx.arc(
        x + player.width / 2,
        y + 23,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Engine flame

    ctx.fillStyle = "#ff8a00";

    ctx.beginPath();

    ctx.moveTo(x + 10, y + player.height);
    ctx.lineTo(x + 16, y + player.height + 15 + Math.random() * 8);
    ctx.lineTo(x + 22, y + player.height);

    ctx.fill();

    ctx.restore();

}

// OBSTACLES

function createObstacle() {

    const obstacleWidth = 30 + Math.random() * 25;

    obstacles.push({

        x: Math.random() * (width - obstacleWidth),

        y: -40,

        width: obstacleWidth,

        height: 25 + Math.random() * 15

    });

}

function drawObstacles() {

    obstacles.forEach(obstacle => {

        ctx.save();

        ctx.shadowColor = "#ff286f";
        ctx.shadowBlur = 18;

        ctx.fillStyle = "#ff286f";

        ctx.fillRect(
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
        );

        ctx.strokeStyle = "#ffb4d0";
        ctx.lineWidth = 2;

        ctx.strokeRect(
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
        );

        ctx.restore();

        if (gameRunning && !gamePaused) {
            obstacle.y += speed;
        }

    });

    obstacles = obstacles.filter(
        obstacle => obstacle.y < height + 50
    );

}

// DIAMONDS

function createGem() {

    gems.push({

        x: 20 + Math.random() * (width - 40),

        y: -30,

        size: 11

    });

}

function drawGems() {

    gems.forEach(gem => {

        ctx.save();

        ctx.translate(gem.x, gem.y);

        ctx.rotate(Math.PI / 4);

        ctx.shadowColor = "#00eaff";
        ctx.shadowBlur = 20;

        ctx.fillStyle = "#00eaff";

        ctx.fillRect(
            -gem.size / 2,
            -gem.size / 2,
            gem.size,
            gem.size
        );

        ctx.restore();

        if (gameRunning && !gamePaused) {
            gem.y += speed;
        }

    });

    gems = gems.filter(gem => gem.y < height + 30);

}

// PARTICLES

function createParticles(x, y, color) {

    for (let i = 0; i < 12; i++) {

        particles.push({

            x: x,
            y: y,

            vx: (Math.random() - 0.5) * 6,

            vy: (Math.random() - 0.5) * 6,

            life: 1,

            color: color

        });

    }

}

function drawParticles() {

    particles.forEach(particle => {

        ctx.globalAlpha = particle.life;

        ctx.fillStyle = particle.color;

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        if (gameRunning && !gamePaused) {

            particle.x += particle.vx;
            particle.y += particle.vy;

            particle.life -= 0.025;

        }

    });

    ctx.globalAlpha = 1;

    particles = particles.filter(
        particle => particle.life > 0
    );

}

// COLLISION DETECTION

function collision(a, b) {

    return (

        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y

    );

}

// CHECK GEM COLLECTION

function collectGems() {

    gems.forEach((gem, index) => {

        const distance = Math.hypot(

            player.x + player.width / 2 - gem.x,

            player.y + player.height / 2 - gem.y

        );

        if (distance < 25) {

            diamonds++;

            score += 50;

            createParticles(gem.x, gem.y, "#00eaff");

            playSound(800);

            gems.splice(index, 1);

            diamondDisplay.textContent = "💎 " + diamonds;

        }

    });

}

// CHECK OBSTACLE COLLISION

function checkObstacles() {

    for (const obstacle of obstacles) {

        if (collision(player, obstacle)) {

            createParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                "#ff286f"
            );

            endGame();

            return;

        }

    }

}

// PLAYER MOVEMENT

function movePlayer() {

    if (keys.left) {
        player.x -= player.speed;
    }

    if (keys.right) {
        player.x += player.speed;
    }

    player.x = Math.max(
        0,
        Math.min(width - player.width, player.x)
    );

}

// UPDATE SCORE

function updateScore() {

    score += 0.1;

    let currentScore = Math.floor(score);

    scoreDisplay.textContent = String(currentScore).padStart(4, "0");

    let newLevel = Math.floor(currentScore / 300) + 1;

    if (newLevel !== level) {

        level = newLevel;

        levelDisplay.textContent = String(level).padStart(2, "0");

        speed += 0.5;

        playSound(600);

    }

}

// MAIN GAME LOOP

function gameLoop() {

    if (!gameRunning || gamePaused) return;

    ctx.clearRect(0, 0, width, height);

    drawBackground();

    movePlayer();

    spawnTimer++;

    gemTimer++;

    if (spawnTimer > Math.max(25, 65 - level * 4)) {

        createObstacle();

        spawnTimer = 0;

    }

    if (gemTimer > 110) {

        createGem();

        gemTimer = 0;

    }

    drawObstacles();

    drawGems();

    drawParticles();

    drawPlayer();

    collectGems();

    checkObstacles();

    if (!gameRunning) return;

    updateScore();

    animationId = requestAnimationFrame(gameLoop);

}

// START GAME

function startGame() {

    cancelAnimationFrame(animationId);

    resetGame();

    startScreen.classList.add("hidden");

    gameOverScreen.classList.add("hidden");

    pauseScreen.classList.add("hidden");

    gameRunning = true;

    gamePaused = false;

    pauseBtn.textContent = "⏸ PAUSE";

    gameLoop();

}

// GAME OVER

function endGame() {

    gameRunning = false;

    gamePaused = false;

    cancelAnimationFrame(animationId);

    let currentScore = Math.floor(score);

    finalScore.textContent = currentScore;

    if (currentScore > highScore) {

        highScore = currentScore;

        localStorage.setItem("neonHighScore", highScore);

        highScoreDisplay.textContent = highScore;

    }

    gameOverScreen.classList.remove("hidden");

    pauseBtn.textContent = "⏸ PAUSE";

    playSound(150, 0.4);

}

// PAUSE GAME

function pauseGame() {

    if (!gameRunning) return;

    gamePaused = true;

    cancelAnimationFrame(animationId);

    pauseScreen.classList.remove("hidden");

    pauseBtn.textContent = "▶ RESUME";

}

// RESUME GAME

function resumeGame() {

    if (!gameRunning) return;

    gamePaused = false;

    pauseScreen.classList.add("hidden");

    pauseBtn.textContent = "⏸ PAUSE";

    gameLoop();

}

// KEYBOARD CONTROLS

document.addEventListener("keydown", function(event) {

    if (
        ["ArrowLeft", "ArrowRight", " "].includes(event.key)
    ) {
        event.preventDefault();
    }

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.left = true;
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.right = true;
    }

    if (event.key === "Escape" && gameRunning) {

        if (gamePaused) {
            resumeGame();
        } else {
            pauseGame();
        }

    }

});

document.addEventListener("keyup", function(event) {

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.left = false;
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.right = false;
    }

});

// MOBILE CONTROLS

function holdButton(button, direction) {

    button.addEventListener("pointerdown", function(event) {

        event.preventDefault();

        keys[direction] = true;

        button.setPointerCapture(event.pointerId);

    });

    function release() {
        keys[direction] = false;
    }

    button.addEventListener("pointerup", release);

    button.addEventListener("pointercancel", release);

    button.addEventListener("lostpointercapture", release);

    button.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

}

holdButton(leftBtn, "left");

holdButton(rightBtn, "right");

// BUTTON EVENTS

startBtn.addEventListener("click", startGame);

restartBtn.addEventListener("click", startGame);

resumeBtn.addEventListener("click", resumeGame);

pauseBtn.addEventListener("click", function() {

    if (!gameRunning) return;

    if (gamePaused) {
        resumeGame();
    } else {
        pauseGame();
    }

});

// SOUND BUTTON

soundBtn.addEventListener("click", function() {

    soundEnabled = !soundEnabled;

    soundBtn.textContent = soundEnabled ? "🔊" : "🔇";

    if (soundEnabled) {
        playSound(700);
    }

});

// INITIAL DISPLAY

createStars();

player.x = width / 2 - player.width / 2;

player.y = height - 75;

drawBackground();

drawPlayer();