// Toggle effects
function toggleEffects() {
    showEffects = !showEffects;
    // Clear existing particles when turning off effects
    if (!showEffects) {
        particles = [];
    }
    console.log('Effects ' + (showEffects ? 'ON' : 'OFF'));
}
