/**
 * MOLFET — Break the Frame · theme JavaScript
 * Vanilla, no jQuery, no libraries. Everything is progressively enhanced:
 * the store works without it, the concept comes alive with it.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ------------------------------------------------------------------ */
  /* 1. THE LENS — brush-circle cursor, growing to 160px over a product */
  /* ------------------------------------------------------------------ */
  function initLens() {
    var cursor = document.getElementById('MolfetLensCursor');
    var template = document.getElementById('MolfetLensTemplate');
    if (!cursor || !template || reduceMotion || isTouch) return;

    var lens = template.content.firstElementChild.cloneNode(true);
    document.body.appendChild(lens);

    var pos = { x: -200, y: -200 };
    var raf = 0;
    var open = false;

    function paint() {
      raf = 0;
      cursor.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)';
      lens.style.left = pos.x + 'px';
      lens.style.top = pos.y + 'px';
    }

    function move(event) {
      pos.x = event.clientX;
      pos.y = event.clientY;
      cursor.setAttribute('data-visible', 'true');
      if (!raf) raf = window.requestAnimationFrame(paint);
    }

    function setLens(stage) {
      if (!stage) {
        if (open) {
          open = false;
          lens.setAttribute('data-open', 'false');
        }
        return;
      }

      var sketch = stage.getAttribute('data-sketch');
      var macro = stage.getAttribute('data-macro');
      var sketchEl = lens.querySelector('.mf-lens__sketch');
      var macroEl = lens.querySelector('.mf-lens__macro');
      var size = (window.MOLFET_LENS_SIZE || 160) + 'px';

      lens.style.width = size;
      lens.style.height = size;
      lens.style.margin = '-' + (parseInt(size, 10) / 2) + 'px 0 0 -' + (parseInt(size, 10) / 2) + 'px';
      sketchEl.style.backgroundImage = sketch ? 'url(' + sketch + ')' : 'none';
      macroEl.style.backgroundImage = macro ? 'url(' + macro + ')' : 'none';

      // maroon on light areas, cream on dark areas
      var tone = stage.closest('[data-tone="dark"]') ? 'dark' : 'light';
      cursor.setAttribute('data-tone', tone);

      if (!open) {
        open = true;
        lens.setAttribute('data-open', 'true');
      }
    }

    document.addEventListener('pointermove', function (event) {
      move(event);
      var stage = event.target.closest('[data-lens-stage], .mf-card__media-link, .mf-product__slides');
      setLens(stage);
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      cursor.setAttribute('data-visible', 'false');
      lens.setAttribute('data-open', 'false');
      open = false;
    });

    /* hotspots: moving the lens over a hotspot shows its callout;
       the macro layer fades in as the pointer rests on it */
    document.querySelectorAll('.mf-hotspot').forEach(function (hotspot) {
      hotspot.addEventListener('pointerenter', function () {
        lens.setAttribute('data-layer', 'macro');
        var macro = hotspot.getAttribute('data-macro');
        if (macro) lens.querySelector('.mf-lens__macro').style.backgroundImage = 'url(' + macro + ')';
      });
      hotspot.addEventListener('pointerleave', function () {
        lens.removeAttribute('data-layer');
      });
      // keyboard: Tab to a hotspot, Enter to open
      hotspot.addEventListener('click', function () {
        var title = hotspot.getAttribute('data-title');
        var text = hotspot.getAttribute('data-text');
        window.MolfetDetail && window.MolfetDetail.open({ title: title, text: text, macro: hotspot.getAttribute('data-macro') });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Detail panel — shared by touch press-and-hold, Detail button     */
  /*    and keyboard activation. Reduced motion: tap to reveal.          */
  /* ------------------------------------------------------------------ */
  function initDetailPanel() {
    var panel = document.createElement('div');
    panel.className = 'mf-detail-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-live', 'polite');
    panel.hidden = true;
    panel.innerHTML =
      '<div class="mf-detail-panel__inner">' +
      '<p class="mf-detail-panel__title"></p>' +
      '<p class="mf-detail-panel__text"></p>' +
      '<button type="button" class="mf-detail-panel__close" aria-label="Close">×</button>' +
      '</div>';
    document.body.appendChild(panel);

    var titleEl = panel.querySelector('.mf-detail-panel__title');
    var textEl = panel.querySelector('.mf-detail-panel__text');

    window.MolfetDetail = {
      open: function (data) {
        if (!data) return;
        titleEl.textContent = data.title || '';
        textEl.textContent = data.text || '';
        panel.hidden = false;
        panel.querySelector('.mf-detail-panel__close').focus();
      },
      close: function () { panel.hidden = true; }
    };

    panel.querySelector('.mf-detail-panel__close').addEventListener('click', window.MolfetDetail.close);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') window.MolfetDetail.close();
    });

    document.querySelectorAll('.mf-detail-tile').forEach(function (tile) {
      tile.addEventListener('click', function () {
        document.querySelectorAll('.mf-detail-tile').forEach(function (other) {
          other.setAttribute('aria-pressed', other === tile ? 'true' : 'false');
        });
        window.MolfetDetail.open({
          title: tile.getAttribute('data-title'),
          text: tile.getAttribute('data-text'),
          macro: tile.getAttribute('data-macro')
        });
      });
    });

    document.querySelectorAll('[data-open-detail]').forEach(function (button) {
      button.addEventListener('click', function () {
        var first = document.querySelector('.mf-hotspot');
        if (first) window.MolfetDetail.open({
          title: first.getAttribute('data-title'),
          text: first.getAttribute('data-text'),
          macro: first.getAttribute('data-macro')
        });
      });
    });

    /* press-and-hold over the product image on touch devices */
    var stage = document.querySelector('[data-lens-stage]');
    if (stage && isTouch) {
      var timer = 0;
      stage.addEventListener('pointerdown', function () {
        timer = window.setTimeout(function () {
          var first = document.querySelector('.mf-hotspot');
          if (first) window.MolfetDetail.open({
            title: first.getAttribute('data-title'),
            text: first.getAttribute('data-text'),
            macro: first.getAttribute('data-macro')
          });
        }, 260);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (eventName) {
        stage.addEventListener(eventName, function () { window.clearTimeout(timer); });
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3. Header — the wordmark collapses into the brush circle on scroll  */
  /* ------------------------------------------------------------------ */
  function initHeader() {
    var header = document.querySelector('.mf-header');
    if (!header) return;
    var last = 0;
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      header.setAttribute('data-scrolled', y > 40 ? 'true' : 'false');
      last = y;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Cart drawer + free-shipping ring                                 */
  /* ------------------------------------------------------------------ */
  function initCart() {
    var drawer = document.querySelector('cart-drawer');
    if (!drawer) return;

    function setOpen(value) {
      drawer.setAttribute('data-open', value ? 'true' : 'false');
      document.body.style.overflow = value ? 'hidden' : '';
      var focusable = drawer.querySelector('button, [href], input');
      if (value && focusable) focusable.focus();
    }

    document.querySelectorAll('[data-open-cart]').forEach(function (button) {
      button.addEventListener('click', function () { setOpen(true); });
    });
    document.querySelectorAll('[data-close-cart]').forEach(function (button) {
      button.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    /* quantity steppers everywhere */
    document.querySelectorAll('.mf-qty').forEach(function (qty) {
      var input = qty.querySelector('input');
      qty.querySelectorAll('[data-qty]').forEach(function (button) {
        button.addEventListener('click', function () {
          var step = parseInt(button.getAttribute('data-qty'), 10);
          var next = Math.max(0, (parseInt(input.value, 10) || 0) + step);
          input.value = next;
          var line = qty.getAttribute('data-line');
          if (line && line !== 'product' && drawer.contains(qty)) {
            fetch(window.Shopify.routes.root + 'cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ line: parseInt(line, 10), quantity: next })
            })
              .then(function (response) { return response.json(); })
              .then(function () { window.location.reload(); });
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. LIMITLESS MIX — one piece per slot, one /cart/add.js request     */
  /* ------------------------------------------------------------------ */
  function initMix() {
    var root = document.querySelector('[data-mix]');
    if (!root) return;

    var slots = ['top', 'bottom', 'outerwear', 'accessory'];
    var selection = {};
    var stack = root.querySelector('[data-mix-stack]');
    var totalEl = root.querySelector('[data-mix-total]');
    var discountEl = root.querySelector('[data-mix-discount]');
    var addButton = root.querySelector('[data-mix-add]');
    var shareButton = root.querySelector('[data-mix-share]');
    var discountPercent = window.MOLFET_LOOK_DISCOUNT || 0;

    function money(cents) {
      var format = window.MOLFET_MONEY_FORMAT || 'EGP {{amount}}';
      var value = (cents / 100).toFixed(2);
      var noDecimals = String(Math.round(cents / 100));
      return format
        .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, noDecimals)
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, value.replace('.', ','))
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/, noDecimals)
        .replace(/\{\{\s*amount\s*\}\}/, value);
    }

    function render() {
      var count = Object.keys(selection).length;
      var total = 0;

      stack.innerHTML = '';
      slots.forEach(function (slot) {
        var pick = selection[slot];
        if (!pick) return;
        var image = document.createElement('img');
        image.src = pick.cutout;
        image.alt = pick.title;
        stack.appendChild(image);
        total += pick.price;
      });

      totalEl.textContent = count ? money(total) : '—';
      if (discountEl) discountEl.hidden = count < 3;
      if (addButton) addButton.disabled = count === 0;
      if (shareButton) shareButton.disabled = count === 0;
    }

    root.querySelectorAll('[data-mix-pick]').forEach(function (piece) {
      piece.addEventListener('click', function () {
        var slot = piece.getAttribute('data-slot');
        var already = piece.getAttribute('aria-pressed') === 'true';

        root.querySelectorAll('[data-mix-pick][data-slot="' + slot + '"]').forEach(function (other) {
          other.setAttribute('aria-pressed', 'false');
        });

        if (already) {
          delete selection[slot];
        } else {
          piece.setAttribute('aria-pressed', 'true');
          selection[slot] = {
            variant: piece.getAttribute('data-variant'),
            price: parseInt(piece.getAttribute('data-price'), 10) || 0,
            title: piece.getAttribute('data-title'),
            cutout: piece.getAttribute('data-cutout')
          };
        }
        render();
      });
    });

    root.querySelectorAll('[data-mix-clear]').forEach(function (button) {
      button.addEventListener('click', function () {
        var row = button.closest('.mf-mix__row');
        var slot = row && row.getAttribute('data-slot');
        if (!slot) return;
        delete selection[slot];
        row.querySelectorAll('[data-mix-pick]').forEach(function (piece) { piece.setAttribute('aria-pressed', 'false'); });
        render();
      });
    });

    if (addButton) {
      addButton.addEventListener('click', function () {
        var items = Object.keys(selection).map(function (slot) {
          return { id: parseInt(selection[slot].variant, 10), quantity: 1 };
        });
        if (!items.length) return;

        addButton.disabled = true;
        fetch(window.Shopify.routes.root + 'cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: items })
        })
          .then(function (response) { return response.json(); })
          .then(function () {
            var drawer = document.querySelector('cart-drawer');
            if (drawer) {
              fetch(window.location.pathname + '?sections=cart-drawer')
                .then(function (r) { return r.json(); })
                .then(function (sections) {
                  var key = Object.keys(sections)[0];
                  var html = new DOMParser().parseFromString(sections[key], 'text/html');
                  var fresh = html.querySelector('cart-drawer');
                  if (fresh) {
                    drawer.innerHTML = fresh.innerHTML;
                  }
                  drawer.setAttribute('data-open', 'true');
                })
                .catch(function () { window.location.href = window.Shopify.routes.root + 'cart'; });
            } else {
              window.location.href = window.Shopify.routes.root + 'cart';
            }
          })
          .catch(function () { window.location.href = window.Shopify.routes.root + 'cart'; })
          .finally(function () { addButton.disabled = false; });
      });
    }

    if (shareButton) {
      shareButton.addEventListener('click', function () {
        var parts = Object.keys(selection).map(function (slot) {
          return slot + ':' + selection[slot].variant;
        });
        var url = window.location.origin + window.location.pathname + '?look=' + encodeURIComponent(parts.join(','));
        if (navigator.share) {
          navigator.share({ title: 'MOLFET — Limitless Mix', url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url);
          shareButton.setAttribute('data-copied', 'true');
        }
      });
    }

    /* hydrate a shared look from ?look=slot:variant,... */
    var params = new URLSearchParams(window.location.search);
    var look = params.get('look');
    if (look) {
      look.split(',').forEach(function (chunk) {
        var bits = chunk.split(':');
        if (bits.length !== 2) return;
        var piece = root.querySelector('[data-mix-pick][data-slot="' + bits[0] + '"][data-variant="' + bits[1] + '"]');
        if (piece) piece.click();
      });
    }

    render();
  }

  /* ------------------------------------------------------------------ */
  /* 6. Page loader — the brush circle draws itself in about 600ms       */
  /* ------------------------------------------------------------------ */
  function initLoader() {
    if (reduceMotion) return;
    var loader = document.querySelector('.mf-loader');
    if (!loader) return;
    window.addEventListener('load', function () {
      window.setTimeout(function () {
        loader.setAttribute('data-done', 'true');
      }, 620);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 7. Misc: back to top, size guide, sticky add-to-cart, gallery       */
  /* ------------------------------------------------------------------ */
  function initMisc() {
    document.querySelectorAll('[data-back-to-top]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });

    document.querySelectorAll('[data-open-size-guide]').forEach(function (button) {
      button.addEventListener('click', function () {
        var guide = document.getElementById('MolfetSizeGuide');
        if (guide && guide.showModal) guide.showModal();
      });
    });

    /* product gallery */
    var gallery = document.querySelector('[data-gallery]');
    if (gallery) {
      gallery.querySelectorAll('.mf-product__slide').forEach(function (slide) {
        slide.addEventListener('click', function () {
          gallery.querySelectorAll('.mf-product__slide').forEach(function (other) {
            other.classList.toggle('is-active', other === slide);
          });
        });
      });
    }

    /* sticky add-to-cart on mobile */
    var sticky = document.querySelector('[data-sticky-atc]');
    var form = document.getElementById('ProductForm');
    var stickyButton = document.querySelector('[data-sticky-add]');
    if (sticky && form && stickyButton) {
      stickyButton.addEventListener('click', function () { form.requestSubmit(); });
    }
  }

  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initCart();
    initLens();
    initDetailPanel();
    initMix();
    initLoader();
    initMisc();
  });
})();
