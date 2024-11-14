class CustomCursor {
    constructor() {
        this.cursor = document.getElementById('custom-cursor');
        this.initEventListeners();
    }

    initEventListeners() {
        document.addEventListener('mousemove', (e) => {
            this.cursor.style.left = e.clientX + 'px';
            this.cursor.style.top = e.clientY + 'px';
        });

        document.addEventListener('mousedown', () => {
            this.cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
            this.cursor.style.borderColor = '#ffd700';
        });

        document.addEventListener('mouseup', () => {
            this.cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            this.cursor.style.borderColor = '#e0d5c1';
        });

        document.querySelectorAll('a, button, input').forEach(element => {
            element.addEventListener('mouseenter', () => {
                this.cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                this.cursor.style.borderColor = '#ffd700';
                this.cursor.style.mixBlendMode = 'difference';
            });

            element.addEventListener('mouseleave', () => {
                this.cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                this.cursor.style.borderColor = '#e0d5c1';
                this.cursor.style.mixBlendMode = 'normal';
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CustomCursor();
}); 