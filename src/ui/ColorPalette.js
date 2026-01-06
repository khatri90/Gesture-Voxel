import { COLORS } from '../utils/constants.js';

export class ColorPalette {
  constructor(containerElement, onColorSelect) {
    this.container = containerElement;
    this.onColorSelect = onColorSelect;
    this.currentIndex = 0;

    this.init();
  }

  init() {
    const colorsContainer = this.container.querySelector('.palette-colors');
    if (!colorsContainer) return;

    // Create color swatches
    COLORS.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      if (index === 0) swatch.classList.add('active');

      // Convert hex to CSS color
      const cssColor = '#' + color.toString(16).padStart(6, '0');
      swatch.style.backgroundColor = cssColor;
      swatch.style.boxShadow = `0 0 8px ${cssColor}40`;

      swatch.addEventListener('click', () => {
        this.selectColor(index);
        if (this.onColorSelect) {
          this.onColorSelect(index);
        }
      });

      colorsContainer.appendChild(swatch);
    });
  }

  selectColor(index) {
    this.currentIndex = index;

    // Update active state
    const swatches = this.container.querySelectorAll('.color-swatch');
    swatches.forEach((swatch, i) => {
      swatch.classList.toggle('active', i === index);
    });
  }

  getCurrentIndex() {
    return this.currentIndex;
  }
}
