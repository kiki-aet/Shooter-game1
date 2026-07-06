// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// Player object
const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    width: 30,
    height: 30,
    speed: 5,
    angle: 0,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    isMoving: false,
    vx: 0,
    vy: 0
};

// Game state
let score = 0;
let level = 1;
let gameActive = true;
let bullets = [];
let enemies = [];
let particles = [];
let enemySpawnRate = 0;

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ') {
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse tracking for aiming
document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

// Click to shoot
document.addEventListener('click', () => {
    if (gameActive) shoot();
});

// Restart button
document.getElementById('restartBtn').addEventListener('click', restartGame);

// Player movement
function updatePlayerMovement() {
    let newVx = 0;
    let newVy = 0;
    
    if (keys['w'] || keys['arrowup']) newVy -= player.speed;
    if (keys['s'] || keys['arrowdown']) newVy += player.speed;
    if (keys['a'] || keys['arrowleft']) newVx -= player.speed;
    if (keys['d'] || keys['arrowright']) newVx += player.speed;
    
    player.x += newVx;
    player.y += newVy;
    
    // Boundary collision
    player.x = Math.max(player.width / 2, Math.min(CANVAS_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(CANVAS_HEIGHT - player.height / 2, player.y));
}

// Shooting
function shoot() {
    if (player.ammo <= 0 || !gameActive) return;
    
    player.ammo--;
    
    const bullet = {
        x: player.x,
        y: player.y,
        vx: Math.cos(player.angle) * 7,
        vy: Math.sin(player.angle) * 7,
        radius: 5,
        damage: 25
    };
    
    bullets.push(bullet);
    
    // Ammo feedback
    updateUI();
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Remove off-screen bullets
        if (bullet.x < 0 || bullet.x > CANVAS_WIDTH || 
            bullet.y < 0 || bullet.y > CANVAS_HEIGHT) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < bullet.radius + enemy.radius) {
                enemy.health -= bullet.damage;
                createExplosion(bullet.x, bullet.y, 10);
                bullets.splice(i, 1);
                
                if (enemy.health <= 0) {
                    score += enemy.points;
                    enemies.splice(j, 1);
                    createExplosion(enemy.x, enemy.y, 20);
                }
                return;
            }
        }
    }
}

// Enemy spawning
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * CANVAS_WIDTH; y = -30; break;
        case 1: x = CANVAS_WIDTH + 30; y = Math.random() * CANVAS_HEIGHT; break;
        case 2: x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + 30; break;
        case 3: x = -30; y = Math.random() * CANVAS_HEIGHT; break;
    }
    
    const enemy = {
        x: x,
        y: y,
        radius: 15,
        speed: 2 + level * 0.5,
        health: 50 + level * 10,
        maxHealth: 50 + level * 10,
        points: 100 + level * 50,
        shootCooldown: 0
    };
    
    enemies.push(enemy);
}

// Update enemies
function updateEnemies() {
    enemySpawnRate++;
    
    // Spawn enemies based on level
    if (enemySpawnRate > Math.max(30 - level * 5, 10)) {
        if (enemies.length < 5 + level * 2) {
            spawnEnemy();
            enemySpawnRate = 0;
        }
    }
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
        
        // Shoot at player
        enemy.shootCooldown++;
        if (enemy.shootCooldown > 60) {
            const bulletVx = (dx / dist) * 4;
            const bulletVy = (dy / dist) * 4;
            
            bullets.push({
                x: enemy.x,
                y: enemy.y,
                vx: bulletVx,
                vy: bulletVy,
                radius: 4,
                damage: 0,
                isEnemyBullet: true
            });
            
            enemy.shootCooldown = 0;
        }
        
        // Check collision with player
        const playerDist = Math.sqrt(dx * dx + dy * dy);
        if (playerDist < player.width / 2 + enemy.radius) {
            player.health -= 0.5;
            if (player.health <= 0) {
                endGame();
            }
        }
    }
}

// Particle effect
function createExplosion(x, y, count) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const velocity = 2 + Math.random() * 3;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: 30,
            maxLife: 30,
            size: 3 + Math.random() * 2
        });
    }
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(10, 14, 39, 0.3)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_WIDTH; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_WIDTH, i);
        ctx.stroke();
    }
    
    // Draw player
    drawPlayer();
    
    // Draw bullets
    ctx.fillStyle = '#00ff88';
    for (const bullet of bullets) {
        if (!bullet.isEnemyBullet) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw enemy bullets
    ctx.fillStyle = '#ff0000';
    for (const bullet of bullets) {
        if (bullet.isEnemyBullet) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw enemies
    for (const enemy of enemies) {
        drawEnemy(enemy);
    }
    
    // Draw particles
    for (const p of particles) {
        const opacity = p.life / p.maxLife;
        ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Body
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    
    // Gun
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(player.width / 2 - 5, -3, 15, 6);
    
    // Health indicator
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
    ctx.fillRect(-player.width / 2, -player.height / 2 - 8, player.width * healthPercent, 4);
    
    ctx.restore();
}

function drawEnemy(enemy) {
    // Body
    const healthPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = `hsl(0, 100%, ${50 - healthPercent * 30}%)`;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 8, enemy.radius * 2, 4);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 8, enemy.radius * 2 * healthPercent, 4);
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('health').textContent = `Health: ${Math.ceil(player.health)}`;
    document.getElementById('ammo').textContent = `Ammo: ${player.ammo}/${player.maxAmmo}`;
    document.getElementById('level').textContent = `Wave: ${level}`;
}

// Ammo regeneration
function regenerateAmmo() {
    if (player.ammo < player.maxAmmo && Math.random() < 0.02) {
        player.ammo++;
    }
}

// Level progression
function checkLevelProgression() {
    const enemiesDefeated = Math.floor(score / (100 + level * 50));
    const newLevel = Math.floor(enemiesDefeated / 5) + 1;
    
    if (newLevel > level) {
        level = newLevel;
        player.health = player.maxHealth;
        createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50);
    }
}

// Game Over
function endGame() {
    gameActive = false;
    document.getElementById('gameOverText').textContent = 'GAME OVER';
    document.getElementById('finalScore').textContent = `Final Score: ${score}`;
    document.getElementById('gameOver').style.display = 'block';
}

// Restart game
function restartGame() {
    score = 0;
    level = 1;
    gameActive = true;
    player.health = player.maxHealth;
    player.ammo = player.maxAmmo;
    player.x = CANVAS_WIDTH / 2;
    player.y = CANVAS_HEIGHT / 2;
    bullets = [];
    enemies = [];
    particles = [];
    document.getElementById('gameOver').style.display = 'none';
    updateUI();
}

// Main game loop
function gameLoop() {
    if (gameActive) {
        updatePlayerMovement();
        updateBullets();
        updateEnemies();
        updateParticles();
        regenerateAmmo();
        checkLevelProgression();
        updateUI();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
updateUI();
gameLoop();
