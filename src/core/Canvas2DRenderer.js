export class Canvas2DRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        // Block settings
        this.BLOCK_SIZE = 30; // 2D block size
        this.gridCols = 0;
        this.gridRows = 0;

        // Drawing state
        this.isDrawing = false;
        this.lastGridX = -1;
        this.lastGridY = -1;

        this.init();
    }

    init() {
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        this.width = this.canvas.parentElement.clientWidth;
        this.height = this.canvas.parentElement.clientHeight;

        // Manage high DPI displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(dpr, dpr);

        // Recalculate grid
        this.gridCols = Math.ceil(this.width / this.BLOCK_SIZE);
        this.gridRows = Math.ceil(this.height / this.BLOCK_SIZE);
    }

    // Draw blocks
    draw(x, y, color) {
        // x and y are normalized (0-1)
        const rawX = (1 - x) * this.width; // Mirror X
        const rawY = y * this.height;

        // Convert to grid coordinates
        const gridX = Math.floor(rawX / this.BLOCK_SIZE);
        const gridY = Math.floor(rawY / this.BLOCK_SIZE);

        if (!this.isDrawing) {
            this.isDrawing = true;
            this.lastGridX = gridX;
            this.lastGridY = gridY;
            this.drawBlock(gridX, gridY, color);
            return;
        }

        // Interpolate between last and current grid position to fill gaps
        this.interpolateBlocks(this.lastGridX, this.lastGridY, gridX, gridY, color);

        this.lastGridX = gridX;
        this.lastGridY = gridY;
    }

    // Draw a single block
    drawBlock(gridX, gridY, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            gridX * this.BLOCK_SIZE,
            gridY * this.BLOCK_SIZE,
            this.BLOCK_SIZE,
            this.BLOCK_SIZE
        );

        // Optional: Add a subtle border to make it look like a block
        this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            gridX * this.BLOCK_SIZE,
            gridY * this.BLOCK_SIZE,
            this.BLOCK_SIZE,
            this.BLOCK_SIZE
        );
    }

    // Simple Bresenham-like line algorithm for grid
    interpolateBlocks(x0, y0, x1, y1, color) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.drawBlock(x0, y0, color);

            if ((x0 === x1) && (y0 === y1)) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    stopDrawing() {
        this.isDrawing = false;
        this.lastGridX = -1;
        this.lastGridY = -1;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}
