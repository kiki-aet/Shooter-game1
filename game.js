// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// Game state
let showEffects = true; // Toggle for visual effects

// Player object
const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    width: 40,
    height: 40,
    speed: 5,
    angle: 0,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    isMoving: false,
    vx: 0,
    vy: 0,
    reloading: false,
    reloadTime: 0,
    maxReloadTime: 30,
    isShooting: false,
    shootCooldown: 0,
    shootDelay: 8 // Frames between shots
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
    const key = e.key.toLowerCase();
    keys[key] = true;
    
    if (e.key === ' ') {
        e.preventDefault();
    }
    
    if (key === 'r') {
        e.preventDefault();
        reload();
    }
    
    if (key === 'f') {
        e.preventDefault();
        toggleEffects();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Toggle effects
function toggleEffects() {
    showEffects = !showEffects;
    // Clear existing particles when turning off effects
    if (!showEffects) {
        particles = [];
    }
    console.log('Effects ' + (showEffects ? 'ON' : 'OFF'));
}

// Mouse tracking for aiming
document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

// Mouse down - start shooting
document.addEventListener('mousedown', (e) => {
    if (gameActive) {
        player.isShooting = true;
        player.shootCooldown = 0;
    }
});

// Mouse up - stop shooting
document.addEventListener('mouseup', (e) => {
    player.isShooting = false;
});

// Space key for shooting
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && gameActive) {
        player.isShooting = true;
        player.shootCooldown = 0;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
        player.isShooting = false;
    }
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

// Continuous shooting
function updateShooting() {
    if (player.isShooting && gameActive && !player.reloading) {
        player.shootCooldown++;
        
        if (player.shootCooldown >= player.shootDelay) {
            shoot();
            player.shootCooldown = 0;
        }
    }
}

// Reload function
function reload() {
    if (player.reloading || player.ammo === player.maxAmmo || !gameActive) return;
    
    player.reloading = true;
    player.reloadTime = 0;
    player.isShooting = false; // Stop shooting when reloading
}

// Update reload
function updateReload() {
    if (player.reloading) {
        player.reloadTime++;
        
        if (player.reloadTime >= player.maxReloadTime) {
            player.ammo = player.maxAmmo;
            player.reloading = false;
            player.reloadTime = 0;
            updateUI();
        }
    }
}

// Shooting
function shoot() {
    if (player.ammo <= 0 || !gameActive || player.reloading) {
        if (player.ammo <= 0 && !player.reloading) {
            // Auto-reload when out of ammo
            reload();
        }
        return;
    }
    
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
    
    // Create muzzle flash
    if (showEffects) {
        createMuzzleFlash();
    }
    updateUI();
}

// Muzzle flash effect
function createMuzzleFlash() {
    const flashX = player.x + Math.cos(player.angle) * 25;
    const flashY = player.y + Math.sin(player.angle) * 25;
    
    for (let i = 0; i < 12; i++) {
        const angle = player.angle + (Math.random() - 0.5) * 0.8;
        const velocity = 3 + Math.random() * 3;
        
        particles.push({
            x: flashX,
            y: flashY,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: 15,
            maxLife: 15,
            size: 3 + Math.random() * 3,
            color: `hsl(${30 + Math.random() * 40}, 100%, ${50 + Math.random() * 40}%)`
        });
    }
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
                if (showEffects) {
                    createExplosion(bullet.x, bullet.y, 15);
                }
                bullets.splice(i, 1);
                
                if (enemy.health <= 0) {
                    score += enemy.points;
                    enemies.splice(j, 1);
                    if (showEffects) {
                        createExplosion(enemy.x, enemy.y, 40);
                    }
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
        radius: 18,
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
            if (dist > 0) {
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
            }
            
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
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const velocity = 2 + Math.random() * 5;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: 50,
            maxLife: 50,
            size: 3 + Math.random() * 4,
            color: `hsl(${Math.random() * 60}, 100%, ${50 + Math.random() * 30}%)`
        });
    }
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.98; // friction
        p.vy *= 0.98;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            p.life--;
        }
    }
}

// Draw everything
function draw() {
    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(10, 14, 39, 0.15)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw starfield background
    drawStarfield();
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.08)';
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
    
    // Draw particles only if effects are on
    if (showEffects) {
        for (const p of particles) {
            const opacity = p.life / p.maxLife;
            let color = `rgba(0, 255, 136, ${opacity})`;
            if (p.color) {
                const colorParts = p.color.match(/hsl\((\d+), (\d+)%, (\d+)%\)/);
                if (colorParts) {
                    color = `hsla(${colorParts[1]}, ${colorParts[2]}%, ${colorParts[3]}%, ${opacity})`;
                }
            }
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw enemies BEFORE player so player is on top
    for (const enemy of enemies) {
        drawEnemy(enemy);
    }
    
    // Draw bullets
    ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00ff88';
    for (const bullet of bullets) {
        if (!bullet.isEnemyBullet) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw enemy bullets
    ctx.shadowColor = 'rgba(255, 51, 51, 0.8)';
    ctx.fillStyle = '#ff3333';
    for (const bullet of bullets) {
        if (bullet.isEnemyBullet) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
    
    // Draw player LAST so it's always on top
    drawPlayer();
    
    // Draw effects toggle indicator
    ctx.fillStyle = showEffects ? '#00ff88' : '#ff3333';
    ctx.font = '12px Arial';
    ctx.fillText(showEffects ? 'Effects: ON' : 'Effects: OFF', 10, CANVAS_HEIGHT - 10);
}

function drawStarfield() {
    // Create pseudo-random starfield
    for (let i = 0; i < 100; i++) {
        const x = (i * 137) % CANVAS_WIDTH;
        const y = (i * 73) % CANVAS_HEIGHT;
        const brightness = ((i * 29) % 100) / 100;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.5})`;
        ctx.fillRect(x, y, 1, 1);
    }
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, player.width / 1.5, player.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main body with bright gradient
    const bodyGradient = ctx.createLinearGradient(-player.width / 2, -player.height / 2, player.width / 2, player.height / 2);
    bodyGradient.addColorStop(0, '#00ffff');
    bodyGradient.addColorStop(0.5, '#00ff88');
    bodyGradient.addColorStop(1, '#00dd66');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    
    // Bright body border
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-player.width / 2, -player.height / 2, player.width, player.height);
    
    // Corner accents
    ctx.fillStyle = '#00ffff';
    const cornerSize = 5;
    ctx.fillRect(-player.width / 2, -player.height / 2, cornerSize, cornerSize);
    ctx.fillRect(player.width / 2 - cornerSize, -player.height / 2, cornerSize, cornerSize);
    ctx.fillRect(-player.width / 2, player.height / 2 - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(player.width / 2 - cornerSize, player.height / 2 - cornerSize, cornerSize, cornerSize);
    
    // Gun barrel - prominent
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(player.width / 2 - 6, -5, 20, 10);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.width / 2 - 6, -5, 20, 10);
    
    // Gun shine
    ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
    ctx.fillRect(player.width / 2 - 6, -5, 20, 3);
    
    // Center circle
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Ammo indicator lights
    const ammoPercent = player.ammo / player.maxAmmo;
    const lightColor = ammoPercent > 0.5 ? '#00ff88' : ammoPercent > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(-player.width / 3, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Health bar background
    ctx.fillStyle = '#333333';
    ctx.fillRect(-player.width / 2, -player.height / 2 - 12, player.width, 6);
    
    // Health bar
    const healthPercent = player.health / player.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = healthColor;
    ctx.fillRect(-player.width / 2, -player.height / 2 - 12, player.width * healthPercent, 6);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-player.width / 2, -player.height / 2 - 12, player.width, 6);
    
    // Reload indicator
    if (player.reloading) {
        const reloadPercent = player.reloadTime / player.maxReloadTime;
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(-player.width / 2, player.height / 2 + 6, player.width * reloadPercent, 5);
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.strokeRect(-player.width / 2, player.height / 2 + 6, player.width, 5);
    }
    
    // Shooting indicator (red glow when shooting)
    if (player.isShooting) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(-player.width / 2 - 3, -player.height / 2 - 3, player.width + 6, player.height + 6);
        ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, enemy.radius * 1.3, enemy.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body with gradient
    const healthPercent = enemy.health / enemy.maxHealth;
    const hue = healthPercent > 0.5 ? 0 : healthPercent > 0.25 ? 30 : 10;
    const lightness = 35 + (1 - healthPercent) * 25;
    
    const enemyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.radius);
    enemyGradient.addColorStop(0, `hsl(${hue}, 100%, ${lightness + 20}%)`);
    enemyGradient.addColorStop(0.7, `hsl(${hue}, 100%, ${lightness}%)`);
    enemyGradient.addColorStop(1, `hsl(${hue}, 100%, ${lightness - 20}%)`);
    ctx.fillStyle = enemyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Enemy border
    ctx.strokeStyle = `hsl(${hue}, 100%, ${lightness + 10}%)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Enemy eyes
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(-5, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-5, -4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth line
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.6, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    
    // Health bar background
    ctx.fillStyle = '#000000';
    ctx.fillRect(-enemy.radius, -enemy.radius - 12, enemy.radius * 2, 5);
    
    // Health bar
    ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
    ctx.fillRect(-enemy.radius, -enemy.radius - 12, enemy.radius * 2 * healthPercent, 5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-enemy.radius, -enemy.radius - 12, enemy.radius * 2, 5);
    
    ctx.restore();
}

// Update UI
function updateUI() {
    const reloadText = player.reloading ? ` (Reloading ${Math.ceil((player.reloadTime / player.maxReloadTime) * 100)}%)` : '';
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('health').textContent = `Health: ${Math.ceil(player.health)}%`;
    document.getElementById('ammo').textContent = `Ammo: ${player.ammo}/${player.maxAmmo}${reloadText}`;
    document.getElementById('level').textContent = `Wave: ${level}`;
}

// Level progression
function checkLevelProgression() {
    const enemiesDefeated = Math.floor(score / (100 + level * 50));
    const newLevel = Math.floor(enemiesDefeated / 5) + 1;
    
    if (newLevel > level) {
        level = newLevel;
        player.health = player.maxHealth;
        if (showEffects) {
            createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100);
        }
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
    player.reloading = false;
    player.reloadTime = 0;
    player.isShooting = false;
    player.shootCooldown = 0;
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
        updateShooting();
        updateBullets();
        updateEnemies();
        updateParticles();
        updateReload();
        checkLevelProgression();
        updateUI();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
updateUI();
gameLoop();
