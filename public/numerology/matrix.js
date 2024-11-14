class MatrixRain {
    constructor() {
        this.canvas = document.getElementById('matrix-rain');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.characters = '✧✦✶✵✹✸✷⚝✯☆⚡☽☉⚯☘⚶';  // Mystical symbols
        this.fontSize = 14;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        this.drops = [];
        this.initialize();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        this.initialize();
    }

    initialize() {
        this.drops = [];
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = Math.random() * -100;
        }
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'; // More transparent
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.15)'; // Golden color with high transparency
        this.ctx.font = `${this.fontSize}px monospace`;
        
        for (let i = 0; i < this.drops.length; i++) {
            if (Math.random() > 0.98) { // Reduce frequency of symbols
                const text = this.characters[Math.floor(Math.random() * this.characters.length)];
                this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);
            }
            
            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.99) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const matrix = new MatrixRain();
    matrix.animate();
}); 