/**
 * gallery-carousel.js
 * Starshot — Lit Web Component
 * Interactive masonry-style gallery with lightbox & carousel navigation.
 * Uses Lit v3 via CDN (no bundler required).
 */

import { LitElement, html, css } from 'https://cdn.jsdelivr.net/npm/lit@3.1.3/index.js';

// ─── Gallery Data ─────────────────────────────────────────────────────────────
const GALLERY_ITEMS = [
  {
    id: 'g1',
    src: 'assets/gallery_photo1.jpg',
    alt: 'Couple candid session di Starshot Studio',
    tag: 'Couple',
    span: 2,   // tall card
  },
  {
    id: 'g2',
    src: 'assets/gallery_photo2.jpg',
    alt: 'Solo portrait estetik di Starshot Studio',
    tag: 'Solo',
    span: 1,
  },
  {
    id: 'g3',
    src: 'assets/gallery_photo3.jpg',
    alt: 'Group photo di Starshot Studio',
    tag: 'Group',
    span: 1,
  },
  {
    id: 'g4',
    src: 'assets/gallery_photo4.jpg',
    alt: 'Moody editorial portrait di Starshot Studio',
    tag: 'Editorial',
    span: 1,
  },
];

// ─── Lightbox Component ───────────────────────────────────────────────────────
class StarshotLightbox extends LitElement {
  static properties = {
    open:    { type: Boolean, reflect: true },
    src:     { type: String },
    alt:     { type: String },
    current: { type: Number },
    total:   { type: Number },
  };

  static styles = css`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(8px);
      align-items: center;
      justify-content: center;
    }
    :host([open]) { display: flex; }

    .lb-backdrop {
      position: absolute;
      inset: 0;
      cursor: zoom-out;
    }
    .lb-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: min(90vw, 800px);
      width: 100%;
      gap: 1.5rem;
      padding: 2rem;
    }
    .lb-img-wrap {
      position: relative;
      width: 100%;
      max-height: 80vh;
      overflow: hidden;
      border-radius: 4px;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      max-height: 80vh;
      object-fit: contain;
      animation: lb-in 250ms ease forwards;
    }
    @keyframes lb-in {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }
    .lb-controls {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .lb-btn {
      width: 44px; height: 44px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      background: transparent;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      transition: background 150ms, border-color 150ms;
    }
    .lb-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); }
    .lb-counter {
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.4);
    }
    .lb-close {
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      width: 40px; height: 40px;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px;
      background: transparent;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 150ms, color 150ms;
    }
    .lb-close:hover { background: rgba(255,255,255,0.08); color: white; }
  `;

  render() {
    return html`
      <div class="lb-backdrop" @click=${this._close} aria-hidden="true"></div>
      <div class="lb-container" role="dialog" aria-modal="true" aria-label="Lightbox galeri foto">
        <button class="lb-close" @click=${this._close} aria-label="Tutup lightbox">&times;</button>
        <div class="lb-img-wrap">
          <img .src=${this.src} .alt=${this.alt} />
        </div>
        <div class="lb-controls">
          <button class="lb-btn" @click=${this._prev} aria-label="Foto sebelumnya">&#8592;</button>
          <span class="lb-counter" aria-live="polite">${this.current + 1} / ${this.total}</span>
          <button class="lb-btn" @click=${this._next} aria-label="Foto selanjutnya">&#8594;</button>
        </div>
      </div>
    `;
  }

  _close() { this.dispatchEvent(new CustomEvent('lb-close', { bubbles: true, composed: true })); }
  _prev()  { this.dispatchEvent(new CustomEvent('lb-prev',  { bubbles: true, composed: true })); }
  _next()  { this.dispatchEvent(new CustomEvent('lb-next',  { bubbles: true, composed: true })); }

  connectedCallback() {
    super.connectedCallback();
    this._keyHandler = (e) => {
      if (!this.open) return;
      if (e.key === 'Escape') this._close();
      if (e.key === 'ArrowLeft') this._prev();
      if (e.key === 'ArrowRight') this._next();
    };
    document.addEventListener('keydown', this._keyHandler);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._keyHandler);
  }
}

customElements.define('starshot-lightbox', StarshotLightbox);


// ─── Gallery Carousel Component ───────────────────────────────────────────────
class GalleryCarousel extends LitElement {
  static properties = {
    _activeTag:  { state: true },
    _lightboxIdx:{ state: true },
    _lbOpen:     { state: true },
    _loaded:     { state: true },
  };

  constructor() {
    super();
    this._activeTag  = 'Semua';
    this._lightboxIdx = 0;
    this._lbOpen     = false;
    this._loaded     = new Set();
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      --gap: 16px;
      --card-radius: 6px;
    }

    /* Filter tabs */
    .gc-filters {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding: 0;
      margin-bottom: 2rem;
    }
    .gc-tag {
      font-family: 'Inter', sans-serif;
      font-size: 0.72rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.5rem 1.25rem;
      border: 1px solid #e2e2e2;
      border-radius: 9999px;
      background: #ffffff;
      cursor: pointer;
      color: #555555;
      transition: all 180ms ease;
    }
    .gc-tag[aria-pressed="true"] {
      background: #0d0d0d;
      color: #ffffff;
      border-color: #0d0d0d;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .gc-tag:not([aria-pressed="true"]):hover {
      background: #f7f6f2;
      border-color: #111111;
      color: #111111;
    }

    /* Masonry grid */
    .gc-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-auto-rows: 270px;
      gap: var(--gap);
      padding: 0;
    }

    /* Individual card */
    .gc-card {
      position: relative;
      overflow: hidden;
      border-radius: var(--card-radius);
      cursor: zoom-in;
      background: #f5f4f0;
    }
    .gc-card--tall { grid-row: span 2; }

    .gc-card img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1),
                  filter 300ms ease;
      filter: grayscale(10%);
    }
    .gc-card:hover img {
      transform: scale(1.04);
      filter: grayscale(0%);
    }

    /* Overlay */
    .gc-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 300ms ease;
      display: flex;
      align-items: flex-end;
      padding: 1.25rem;
    }
    .gc-card:hover .gc-overlay { opacity: 1; }

    .gc-overlay-tag {
      font-family: 'Inter', sans-serif;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.95);
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
    }

    /* Skeleton loader */
    .gc-skeleton {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #eeeeee 25%, #f5f5f5 50%, #eeeeee 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.4s ease infinite;
    }
    @keyframes skeleton-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Empty state */
    .gc-empty {
      grid-column: 1 / -1;
      padding: 4rem 0;
      text-align: center;
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      color: #aeaeae;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .gc-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 230px; }
    }
    @media (max-width: 768px) {
      .gc-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 200px; }
      .gc-card--tall { grid-row: span 1; }
    }
    @media (max-width: 480px) {
      .gc-grid { grid-template-columns: 1fr 1fr; grid-auto-rows: 180px; }
    }
  `;

  get _tags() {
    const t = new Set(['Semua']);
    GALLERY_ITEMS.forEach(i => t.add(i.tag));
    return [...t];
  }

  get _filtered() {
    if (this._activeTag === 'Semua') return GALLERY_ITEMS;
    return GALLERY_ITEMS.filter(i => i.tag === this._activeTag);
  }

  _openLightbox(idx) {
    this._lightboxIdx = idx;
    this._lbOpen = true;
    document.body.style.overflow = 'hidden';
  }
  _closeLightbox() {
    this._lbOpen = false;
    document.body.style.overflow = '';
  }
  _prevLightbox() {
    const items = this._filtered;
    this._lightboxIdx = (this._lightboxIdx - 1 + items.length) % items.length;
  }
  _nextLightbox() {
    const items = this._filtered;
    this._lightboxIdx = (this._lightboxIdx + 1) % items.length;
  }

  _onImgLoad(id) {
    this._loaded = new Set([...this._loaded, id]);
  }

  render() {
    const items   = this._filtered;
    const current = items[this._lightboxIdx];

    return html`
      <!-- Filter Tabs -->
      <div class="gc-filters" role="group" aria-label="Filter galeri">
        ${this._tags.map(tag => html`
          <button
            class="gc-tag"
            aria-pressed=${this._activeTag === tag}
            @click=${() => { this._activeTag = tag; this._lightboxIdx = 0; }}
          >${tag}</button>
        `)}
      </div>

      <!-- Masonry Grid -->
      <div class="gc-grid" role="list" aria-label="Foto galeri Starshot">
        ${items.length === 0
          ? html`<div class="gc-empty">Tidak ada foto untuk kategori ini.</div>`
          : items.map((item, idx) => html`
            <div
              class="gc-card ${item.span === 2 ? 'gc-card--tall' : ''}"
              role="listitem"
              tabindex="0"
              aria-label="Buka foto: ${item.alt}"
              @click=${() => this._openLightbox(idx)}
              @keydown=${(e) => (e.key === 'Enter' || e.key === ' ') && this._openLightbox(idx)}
            >
              ${!this._loaded.has(item.id) ? html`<div class="gc-skeleton" aria-hidden="true"></div>` : ''}
              <img
                src=${item.src}
                alt=${item.alt}
                loading="lazy"
                decoding="async"
                style=${this._loaded.has(item.id) ? '' : 'opacity:0;position:absolute;'}
                @load=${() => this._onImgLoad(item.id)}
                @error=${() => this._onImgLoad(item.id)}
              />
              <div class="gc-overlay" aria-hidden="true">
                <span class="gc-overlay-tag">${item.tag}</span>
              </div>
            </div>
          `)
        }
      </div>

      <!-- Lightbox -->
      <starshot-lightbox
        ?open=${this._lbOpen}
        src=${current?.src ?? ''}
        alt=${current?.alt ?? ''}
        current=${this._lightboxIdx}
        total=${items.length}
        @lb-close=${this._closeLightbox}
        @lb-prev=${this._prevLightbox}
        @lb-next=${this._nextLightbox}
      ></starshot-lightbox>
    `;
  }
}

customElements.define('gallery-carousel', GalleryCarousel);
