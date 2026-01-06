export class HistoryManager {
  constructor(maxHistory = 50) {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = maxHistory;
  }

  // Save current state to history
  saveState(state) {
    // Remove any future states if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    this.history.push(state);
    this.currentIndex = this.history.length - 1;

    // Remove old states if we exceed max
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  // Undo - return previous state
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // Redo - return next state
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // Check if undo is available
  canUndo() {
    return this.currentIndex > 0;
  }

  // Check if redo is available
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  // Clear history
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}
