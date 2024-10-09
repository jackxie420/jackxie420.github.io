const player = document.getElementById('player');
const target = document.getElementById('target');
const scoreDisplay = document.getElementById('score');

let score = 0;
let playerPosition = { x: 0, y: 0 };

// Initialize target position
function setTargetPosition() {
    const x = Math.floor(Math.random() * 380);
    const y = Math.floor(Math.random() * 380);
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
}

function updateScore() {
    scoreDisplay.innerText = `Score: ${score}`;
}

function movePlayer(dx, dy) {
    playerPosition.x = Math.min(Math.max(playerPosition.x + dx, 0), 380);
    playerPosition.y = Math.min(Math.max(playerPosition.y + dy, 0), 380);
    
    player.style.left = `${playerPosition.x}px`;
    player.style.top = `${playerPosition.y}px`;
    
    checkCollision();
}

function checkCollision() {
    const playerRect = player.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    if (
        playerRect.x < targetRect.x + targetRect.width &&
        playerRect.x + playerRect.width > targetRect.x &&
        playerRect.y < targetRect.y + targetRect.height &&
        playerRect.y + playerRect.height > targetRect.y
    ) {
        score++;
        updateScore();
        setTargetPosition();
    }
}

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            movePlayer(0, -20);
            break;
        case 'ArrowDown':
            movePlayer(0, 20);
            break;
        case 'ArrowLeft':
            movePlayer(-20, 0);
            break;
        case 'ArrowRight':
            movePlayer(20, 0);
            break;
    }
});

// Start the game
setTargetPosition();
updateScore();
