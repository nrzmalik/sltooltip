window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
window.Script1 = function()
{
  class Tooltip {
  constructor() {
    this.tooltip = null;
    this.showTimeout = null;
    this.hideTimeout = null;
    this.currentTarget = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.resizeObserver = null;
    this.init();
  }

  init() {
    try {
      this.createStyles();
      this.createTooltipElement();
      this.setupResizeObserver();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to initialize tooltip:', error);
    }
  }

  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .custom-tooltip {
        position: fixed;
        background-color: rgba(33, 33, 33, 0.95);
        color: #fff;
        padding: 10px 15px;
        border-radius: 6px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
        pointer-events: none;
        opacity: 0;
        transform: translateY(5px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        z-index: 1000000; /* Increased z-index */
        max-width: 250px;
        word-wrap: break-word;
        line-height: 1.4;
        visibility: hidden; /* Start hidden */
      }
      .custom-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
        visibility: visible;
      }
      .custom-tooltip::after {
        content: '';
        position: absolute;
        border-style: solid;
        border-width: 6px;
      }
      .custom-tooltip.top::after {
        border-color: rgba(33, 33, 33, 0.95) transparent transparent transparent;
        top: 100%;
        left: 50%;
        margin-left: -6px;
      }
      .custom-tooltip.bottom::after {
        border-color: transparent transparent rgba(33, 33, 33, 0.95) transparent;
        bottom: 100%;
        left: 50%;
        margin-left: -6px;
      }
    `;
    document.head.appendChild(style);
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      if (this.currentTarget && this.tooltip.classList.contains('visible')) {
        this.positionTooltip(this.currentTarget);
      }
    });
    this.resizeObserver.observe(document.body);
  }

  createTooltipElement() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'custom-tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(this.tooltip);
  }

  attachEventListeners() {
    const handlers = {
      mouseover: this.handleMouseOver.bind(this),
      mouseout: this.handleMouseOut.bind(this),
      focusin: this.handleFocusIn.bind(this),
      focusout: this.handleFocusOut.bind(this),
      touchstart: this.handleTouchStart.bind(this),
      touchend: this.handleTouchEnd.bind(this),
      scroll: this.handleScroll.bind(this),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      document.body.addEventListener(event, handler, { passive: true });
    });
  }

  handleScroll() {
    if (this.currentTarget) {
      this.positionTooltip(this.currentTarget);
    }
  }

  handleMouseOver(event) {
    const target = event.target.closest('[data-acc-text]');
    if (!target || !this.isValidTarget(target)) return;
    
    this.currentTarget = target;
    clearTimeout(this.showTimeout);
    this.showTimeout = setTimeout(() => this.showTooltip(target), 200);
  }

  handleMouseOut(event) {
    if (!event.relatedTarget || !event.relatedTarget.closest('[data-acc-text]')) {
      clearTimeout(this.showTimeout);
      this.hideTooltip();
    }
  }

  isValidTarget(target) {
    const tooltipText = target.getAttribute('data-acc-text');
    return tooltipText && tooltipText.trim().length > 0;
  }

  positionTooltip(target) {
    if (!target || !this.tooltip) return;

    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spacing = 10;

    // Calculate positions
    let position = this.calculateOptimalPosition(rect, tooltipRect, viewportHeight, viewportWidth, spacing);

    // Apply positions
    this.tooltip.style.top = `${position.top}px`;
    this.tooltip.style.left = `${position.left}px`;
    
    // Update arrow position
    this.tooltip.classList.toggle('top', position.isTop);
    this.tooltip.classList.toggle('bottom', !position.isTop);
  }

  calculateOptimalPosition(targetRect, tooltipRect, viewportHeight, viewportWidth, spacing) {
    let top, left, isTop = false;

    // Try to position below first
    top = targetRect.bottom + spacing;
    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;

    // Check if tooltip would go below viewport
    if (top + tooltipRect.height > viewportHeight) {
      top = targetRect.top - tooltipRect.height - spacing;
      isTop = true;
    }

    // Adjust horizontal position if needed
    if (left + tooltipRect.width > viewportWidth) {
      left = viewportWidth - tooltipRect.width - spacing;
    }
    if (left < spacing) {
      left = spacing;
    }

    return { top, left, isTop };
  }

  showTooltip(target) {
    if (!target || !this.isValidTarget(target)) return;

    const tooltipText = target.getAttribute('data-acc-text');
    this.tooltip.textContent = tooltipText;
    this.tooltip.setAttribute('aria-hidden', 'false');
    
    // Position before showing for smooth animation
    this.positionTooltip(target);
    
    requestAnimationFrame(() => {
      this.tooltip.classList.add('visible');
    });
  }

  hideTooltip() {
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      this.tooltip.classList.remove('visible');
      this.tooltip.setAttribute('aria-hidden', 'true');
      this.currentTarget = null;
    }, 200);
  }

  handleFocusIn(event) {
    const target = event.target.closest('[data-acc-text]');
    if (!target || !this.isValidTarget(target)) return;
    this.currentTarget = target;
    this.showTooltip(target);
  }

  handleFocusOut() {
    this.hideTooltip();
  }

  handleTouchStart(event) {
    const target = event.target.closest('[data-acc-text]');
    if (!target || !this.isValidTarget(target)) return;
    
    this.currentTarget = target;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.showTimeout = setTimeout(() => this.showTooltip(target), 200);
  }

  handleTouchEnd(event) {
    if (!this.currentTarget) return;
    
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const distance = Math.sqrt(
      Math.pow(touchEndX - this.touchStartX, 2) +
      Math.pow(touchEndY - this.touchStartY, 2)
    );

    if (distance < 10) { // Threshold for considering it a tap, not a scroll
      clearTimeout(this.showTimeout);
      this.toggleTooltip(this.currentTarget);
    } else {
      this.hideTooltip();
    }
  }

  toggleTooltip(target) {
    if (this.tooltip.classList.contains('visible')) {
      this.hideTooltip();
    } else {
      this.showTooltip(target);
    }
  }

  destroy() {
    // Cleanup method
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}

// Initialize the tooltip with error handling
function initializeTooltip() {
  try {
    if (window.tooltipInstance) {
      window.tooltipInstance.destroy();
    }
    window.tooltipInstance = new Tooltip();
  } catch (error) {
    console.error('Failed to initialize tooltip:', error);
  }
}

// Initialize when the document is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeTooltip();
} else {
  document.addEventListener('DOMContentLoaded', initializeTooltip);
}
     
}

};
