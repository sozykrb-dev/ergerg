/**
 * MOLFET — Break the Frame · theme JavaScript
 * Vanilla, no jQuery, no libraries. Everything is progressively enhanced:
 * the store works without it, the concept comes alive with it.
 */
(function () {
  'use strict';

  // Feature-detect matchMedia: an older WebView without it must still get the
  // cart, the forms and the rail, so never let this line throw.
  function media(query) {
    try {
      return !!(window.matchMedia && window.matchMedia(query).matches);
    } catch (err) {
      return false;
    }
  }

  var reduceMotion = media('(prefers-reduced-motion: reduce)');
  var isTouch = media('(hover: none), (pointer: coarse)');

  // Shopify always injects window.Shopify; fall back to the site root so a
  // cached or embedded copy can never throw on an undefined object.
  function rootUrl() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  }

  /* ------------------------------------------------------------------ */
  /* 1. THE LENS — brush-circle cursor, growing to 160px over a product */
  /* ------------------------------------------------------------------ */
  function initLens() {
    var cursor = document.getElementById('MolfetLensCursor');
    var template = document.getElementById('MolfetLensTemplate');
    if (!cursor || !template || reduceMotion || isTouch) return;

    var lens = template.content.firstElementChild.cloneNode(true);
    document.body.appendChild(lens);

    // Only now hide the native arrow — the brush circle is the cursor, and it
    // must never sit underneath a visible arrow. Add the class after mounting so
    // a failure above leaves the normal cursor in place.
    document.documentElement.classList.add('mf-lens-on');

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
      // target can be the document itself (synthetic events, some assistive
      // tech) and Document has no closest(); guard before asking.
      var target = event.target;
      var stage = target && target.closest
        ? target.closest('[data-lens-stage], .mf-card__media-link, .mf-product__slides')
        : null;
      setLens(stage);
    }, { passive: true });

    // Leaving the window does not reliably fire pointerleave on document (it
    // does not fire at all when the pointer exits onto browser chrome), which
    // used to strand the ring on screen. Hide on every "pointer is gone" event;
    // park the brush circle off-viewport too so it cannot be found at rest.
    function dismiss() {
      cursor.setAttribute('data-visible', 'false');
      lens.setAttribute('data-open', 'false');
      open = false;
    }

    function park() {
      dismiss();
      cursor.style.transform = 'translate3d(-9999px,-9999px,0)';
      lens.style.left = '-9999px';
      lens.style.top = '-9999px';
    }

    document.addEventListener('pointerleave', dismiss);
    document.addEventListener('pointerout', function (event) {
      if (!event.relatedTarget) dismiss();
    });
    window.addEventListener('blur', dismiss);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) dismiss();
    });
    park();

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
      drawer.setAttribute('aria-hidden', value ? 'false' : 'true');
      document.body.style.overflow = value ? 'hidden' : '';
      if (value) {
        var focusable = drawer.querySelector('button, [href], input');
        if (focusable) focusable.focus();
      } else if (lastFocus && document.contains(lastFocus)) {
        lastFocus.focus();
      }
    }
    var lastFocus = null;

    /* Replaced innerHTML (after an add, a quantity change or a line removal)
       loses every listener, so the drawer's controls are delegated from the
       element that stays. This is what keeps quick add → drawer → quantity
       working without a page reload. */
    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-open-cart]');
      if (opener) {
        event.preventDefault();
        lastFocus = opener;
        setOpen(true);
        return;
      }
      if (event.target.closest('[data-close-cart]')) {
        setOpen(false);
        return;
      }
      var stepper = event.target.closest('[data-qty]');
      if (stepper && drawer.contains(stepper)) {
        var qty = stepper.closest('.mf-qty');
        var input = qty && qty.querySelector('input');
        var line = qty && qty.getAttribute('data-line');
        if (!input || !line || line === 'product') return;
        event.preventDefault();
        changeLine(parseInt(line, 10), Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(stepper.getAttribute('data-qty'), 10)));
        return;
      }
      var remove = event.target.closest('[data-remove-line]');
      if (remove && drawer.contains(remove)) {
        event.preventDefault();
        changeLine(parseInt(remove.getAttribute('data-remove-line'), 10), 0);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer.getAttribute('data-open') === 'true') setOpen(false);
    });

    function changeLine(line, quantity) {
      if (!line) return;
      fetch(rootUrl() + 'cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line: line, quantity: quantity })
      })
        .then(function (response) { return response.json(); })
        .then(function () { refreshDrawer(); })
        .catch(function () { window.location.href = rootUrl() + 'cart'; });
    }

    /* Fetch the cart-drawer *section* (sections/cart-drawer.liquid) and swap
       its content in, keeping this element and its listeners. */
    function refreshDrawer() {
      return fetch(rootUrl() + '?sections=cart-drawer')
        .then(function (response) { return response.json(); })
        .then(function (sections) {
          var html = sections['cart-drawer'];
          if (!html) return;
          var parsed = new DOMParser().parseFromString(html, 'text/html');
          var fresh = parsed.querySelector('cart-drawer');
          if (fresh) drawer.innerHTML = fresh.innerHTML;
        })
        .catch(function () {});
    }

    window.MOLFET = window.MOLFET || {};
    window.MOLFET.setCartOpen = setOpen;
    window.MOLFET.refreshCart = refreshDrawer;
    window.MOLFET.openCart = function () {
      return refreshDrawer().then(function () { setOpen(true); });
    };
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
        fetch(rootUrl() + 'cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: items })
        })
          .then(function (response) { return response.json(); })
          .then(function () {
            if (window.MOLFET && window.MOLFET.openCart) {
              window.MOLFET.openCart();
            } else {
              window.location.href = rootUrl() + 'cart';
            }
          })
          .catch(function () { window.location.href = rootUrl() + 'cart'; })
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
  /* 7b. The subject also steps out on scroll — an IntersectionObserver   */
  /*     adds .is-breaking once the framed image is in view. CSS does the */
  /*     movement, so prefers-reduced-motion can switch it off entirely.  */
  /* ------------------------------------------------------------------ */
  function initFrameBreak() {
    var frames = document.querySelectorAll('.mf-frame');
    if (!frames.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      frames.forEach(function (frame) { frame.classList.add('is-breaking'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-breaking');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });

    frames.forEach(function (frame) { observer.observe(frame); });
  }

  /* ------------------------------------------------------------------ */
  /* 8. Add to cart, without a reload                                    */
  /*    Quick add on a card and the product form both post to            */
  /*    /cart/add.js and open the drawer through the shared refresher.   */
  /* ------------------------------------------------------------------ */
  function initAddToCart() {
    function post(form, button) {
      var data = new FormData(form);
      var id = data.get('id');
      var quantity = parseInt(data.get('quantity') || '1', 10) || 1;
      if (!id) return false;

      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }

      fetch(rootUrl() + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: parseInt(id, 10), quantity: quantity }] })
      })
        .then(function (response) {
          if (!response.ok) throw new Error('add failed');
          return response.json();
        })
        .then(function () {
          if (window.MOLFET && window.MOLFET.openCart) window.MOLFET.openCart();
        })
        .catch(function () { form.submit(); })
        .finally(function () {
          if (button) {
            button.disabled = false;
            button.removeAttribute('aria-busy');
          }
        });
      return true;
    }

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.matches('.mf-card__quickadd, #ProductForm')) return;
      var button = form.querySelector('[type=submit]');
      if (post(form, button)) event.preventDefault();
    }, true);
  }


  /* ------------------------------------------------------------------ */
  /* 9. RACK VIEW — garments turn on their hangers, the rail is pullable */
  /* ------------------------------------------------------------------ */
  /* `initRack` used to grab the first `[data-rack]` on the page. A collection
     can now hold one behind a toggle as well as the dedicated rack page, so the
     root is passed in, and a rail that was initialised once is remembered — the
     view switch calls back in when its panel becomes visible and must not bind
     a second set of listeners. */
  var rackRoots = typeof WeakSet === 'function' ? new WeakSet() : null;
  var rackInitialised = [];

  function rackSeen(root) {
    if (rackRoots) return rackRoots.has(root);
    return rackInitialised.indexOf(root) !== -1;
  }

  function rackMark(root) {
    if (rackRoots) rackRoots.add(root);
    else rackInitialised.push(root);
  }

  /* ------------------------------------------------------------------ */
  /* 9. THE RING — the rail bent into a circle                          */
  /* ------------------------------------------------------------------ */
  var CIRCLE_STEP = 36;      // degrees between two neighbouring pieces

  /* ------------------------------------------------------------------ */
  /* 9. THE RACK — clothes hung around a rail                           */
  /* ------------------------------------------------------------------ */
  /*  The arithmetic, and the whole of it. A piece at index i stands at
        θ = (i − current) · 360/count
      and is placed by
        x     = sin(θ)                   · how far along the rail
        scale = .70 + .34 · cos(θ)       · how big (front full, back smaller)
        alpha = 1 − .70 · (1−cos θ)/2    · how solid
        z     = cos(θ)                   · paint order, far first
      That is a ring seen in perspective, done with two numbers instead of a 3D
      context — which is also why it cannot be clipped by one. */
  var RACK_STEP = 360;

  function initRackFor(root) {
    if (!root || rackSeen(root)) return;
    rackMark(root);

    var stage = root.querySelector('[data-rack-stage]');
    var list = root.querySelector('[data-rack-list]');
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-rack-item]'));
    var dotsBox = root.querySelector('[data-rack-dots]');
    var frontLink = root.querySelector('[data-rack-front]');
    var indexEl = root.querySelector('[data-rack-index]');
    var totalEl = root.querySelector('[data-rack-total]');
    var priceEl = root.querySelector('[data-rack-price]');
    var count = items.length;
    if (!count) return;

    var rtl = document.documentElement.dir === 'rtl';
    var step = RACK_STEP / count;
    var active = -1;      // which piece is at the front; -1 forces a first paint
    var current = 0;      // the rack's position, in pieces (may be fractional)
    var dragSrc = 0;

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function render() {
      for (var i = 0; i < count; i++) {
        var theta = (i - current) * step * Math.PI / 180;
        var sn = Math.sin(theta);
        var cs = Math.cos(theta);
        var depth = (1 - cs) / 2;
        var item = items[i];

        /* rtl turns the other way, so dragging right in Arabic goes back */
        item.style.setProperty('--x', (rtl ? -sn : sn).toFixed(4));
        item.style.setProperty('--s', (0.70 + 0.34 * cs).toFixed(4));
        item.style.setProperty('--o', (1 - 0.70 * depth).toFixed(3));
        /* the far side is painted first, or the ring looks inside out */
        item.style.zIndex = String(Math.round((cs + 1) * 50));
      }

      /* `current` runs continuously; the nameable front is the nearest whole
         piece, wrapped so that index count is index 0 again. */
      var wrapped = ((Math.round(current) % count) + count) % count;
      if (wrapped !== active) {
        active = wrapped;
        var front = items[active];

        items.forEach(function (el, i) {
          el.setAttribute('data-front', i === active ? 'true' : 'false');
          var link = el.querySelector('a');
          if (link) {
            link.setAttribute('tabindex', i === active ? '0' : '-1');
            if (i === active) link.removeAttribute('aria-hidden');
            else link.setAttribute('aria-hidden', 'true');
          }
        });

        if (frontLink) {
          var anchor = front.querySelector('a');
          var image = front.querySelector('img');
          if (anchor && anchor.getAttribute('href')) frontLink.setAttribute('href', anchor.getAttribute('href'));
          frontLink.textContent = image && image.getAttribute('alt')
            ? image.getAttribute('alt')
            : (front.getAttribute('data-title') || frontLink.textContent);
        }
        if (indexEl) indexEl.textContent = pad(active + 1);
        if (priceEl) priceEl.textContent = front.getAttribute('data-price') || '';
        if (dotsBox) {
          Array.prototype.forEach.call(dotsBox.children, function (dot, n) {
            dot.setAttribute('data-active', n === active ? 'true' : 'false');
          });
        }
      }
    }

    function go(n) {
      /* a ring has no ends: past the last piece is the first. Clamping instead
         would leave a dead stretch of scrolling at both ends. */
      current = ((n % count) + count) % count;
      render();
    }

    function stepBy(direction) {
      go(Math.round(current) + direction);
    }

    /* --- dots: one per piece, built once ------------------------------- */
    /* A rack that is re-initialised (the collection's grid/rack toggle) would
       otherwise stack a second set of dots on the first. */
    if (dotsBox && !dotsBox.children.length) {
      for (var d = 0; d < count; d++) {
        var dot = document.createElement('span');
        dot.className = 'mf-rack__dot';
        dot.setAttribute('data-active', d === 0 ? 'true' : 'false');
        dotsBox.appendChild(dot);
      }
    }
    if (totalEl) totalEl.textContent = pad(count);

    /* --- sizing: the rail is as wide as the room it has --------------- */
    /* Sizing.
       The rail is as wide as the room it has. What is not free is the *pieces*:
       with n pieces 360/n apart, the near neighbour's centre sits at
       (rail/2)·sin(step), and if two pieces' half-widths add up to more than
       that they overlap into a wall. So the piece width is derived from the
       count rather than fixed — the rack fits whether the catalogue holds five
       garments or nine.

         count 5 -> pieces 3.8x apart, roomy
         count 6 -> 2.6x apart, the look the design settled on
         count 7 -> 1.6x apart, tight but readable
         count 8 -> the rail widens to keep them apart
    */
    function measure() {
      var width = (stage && stage.clientWidth) || root.clientWidth || 360;

      /* the air that has to be left between one piece and its neighbour */
      var AIR = 10;
      var gapAngle = (2 * Math.PI) / count;
      /* both of the near pair are scaled by their own depth */
      var scaleNear = 0.70 + 0.34 * Math.cos(gapAngle);

      var rail = Math.min(348, Math.max(236, width * 0.87));
      var reach = (rail / 2) * Math.sin(gapAngle);   // centre to centre, px
      var maxPiece = ((reach - AIR) * 2) / (1.04 + scaleNear);

      /* never smaller than a photograph still reads, never bigger than the
         look the design settled on */
      var piece = Math.min(126, Math.max(78, maxPiece));

      /* If the count is high enough that even the floor overlaps, widen the
         rail instead of letting the clothes collide. */
      if (maxPiece < 78) {
        rail = Math.min(width - 16, ((78 / 2) * (1.04 + scaleNear) + AIR) / Math.sin(gapAngle) * 2);
        piece = 78;
      }

      root.style.setProperty('--rack-w', rail.toFixed(0) + 'px');
      root.style.setProperty('--rack-h', Math.round(rail * 0.176) + 'px');
      root.style.setProperty('--rack-drop', Math.round(rail * 0.103) + 'px');
      root.style.setProperty('--piece-w', piece.toFixed(0) + 'px');
      root.style.setProperty('--piece-h', (piece * 1.372).toFixed(0) + 'px');
    }

    /* --- scrolling: on a phone the page is the control ----------------- */
    /* The panel is pinned, so the document's own scroll turns the rack: one
       `--rack-span` of scrolling is one complete turn. A desktop never gets
       here — the pin does not exist above 989px and the page must not be
       hijacked. */
    var span = 0;
    function measureSpan() {
      span = Math.max(320, window.innerHeight * 0.9);
      root.style.setProperty('--rack-span', span + 'px');
    }

    /* Where the pinned stretch begins, in document coordinates. It has to be
       re-read every time rather than cached: while the panel is hidden the
       rect is all zeroes, and a cached zero would make every scroll position
       look like the very start of the ring. */
    function startOf() {
      var box = root.getBoundingClientRect();
      var top = box.top;
      /* A rect of exactly zero height means the panel is not laid out yet
         (hidden, or still being parsed). The pin is only meaningful once it
         is, so the stretch begins wherever the page is scrolled to then. */
      if (!box.height) return window.scrollY || window.pageYOffset || 0;
      return (window.scrollY || window.pageYOffset || 0) + top;
    }

    function fromScroll(y) {
      if (window.innerWidth > 989) return;
      var travelled = y - startOf();
      if (travelled <= 0) { go(0); return; }
      if (travelled >= span) { go(count); return; }
      go(travelled / span * count);
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        /* A hidden panel has no geometry to read, and no business turning the
           rack: the user is looking at the grid. `hidden` is the panel's own
           attribute, so this is the only reliable test. */
        var panel = root.closest('[data-view-panel]');
        if (panel && (panel.hasAttribute('hidden') || panel.closest('[hidden]'))) return;
        fromScroll(window.scrollY || window.pageYOffset || 0);
      });
    }, { passive: true });

    /* --- dragging, for the hands that expect it ------------------------ */
    if (stage) {
      stage.addEventListener('pointerdown', function (event) {
        if (event.target.closest('button')) return;
        dragSrc = { x: event.clientX, base: current, moved: false };
        /* Claim the gesture only once it is clearly sideways. Capturing on
           pointerdown swallows the page's own vertical scroll. */
      });
      stage.addEventListener('pointermove', function (event) {
        if (!dragSrc) return;
        var dx = event.clientX - dragSrc.x;
        if (!dragSrc.moved && Math.abs(dx) < 8) return;
        dragSrc.moved = true;
        stage.setAttribute('data-dragging', 'true');
        go(dragSrc.base + (rtl ? dx : -dx) / 70);
      });
      function release() {
        if (!dragSrc) return;
        stage.removeAttribute('data-dragging');
        if (dragSrc.moved) go(Math.round(current));
        dragSrc = null;
      }
      stage.addEventListener('pointerup', release);
      stage.addEventListener('pointercancel', release);
      stage.addEventListener('pointerleave', release);

      stage.addEventListener('wheel', function (event) {
        if (event.ctrlKey) return;
        if (window.innerWidth <= 989) return;   // the page owns the wheel here
        var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!delta) return;
        event.preventDefault();
        stepBy(delta > 0 ? 1 : -1);
      }, { passive: false });
    }

    var prev = root.querySelector('[data-rack-prev]');
    var next = root.querySelector('[data-rack-next]');
    if (prev) prev.addEventListener('click', function () { stepBy(rtl ? 1 : -1); });
    if (next) next.addEventListener('click', function () { stepBy(rtl ? -1 : 1); });

    root.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); stepBy(rtl ? -1 : 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); stepBy(rtl ? 1 : -1); }
    });

    function resize() { measure(); measureSpan(); render(); }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    measure();
    measureSpan();
    render();
  }

  function initRack() {
    document.querySelectorAll('[data-rack]').forEach(function (root) {
      /* The collection puts the rack in a panel that starts hidden. Skipping
         it here meant it was never built at all — `render()` never ran, so the
         first paint had every piece stacked at the front and no dots. Build it
         regardless of visibility; `measure()` only needs a fallback width,
         which it has. */
      initRackFor(root);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 9a. MOBILE MENU — the only navigation a phone gets                 */
  /* ------------------------------------------------------------------ */
  function initMenu() {
    var menu = document.getElementById('MolfetMobileMenu');
    var openers = document.querySelectorAll('[data-open-menu]');
    if (!menu || !openers.length) return;

    var panel = menu.querySelector('.mf-menu__panel');
    var closers = menu.querySelectorAll('[data-close-menu]');
    var lastFocus = null;
    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    function focusables() {
      return Array.prototype.slice.call(panel.querySelectorAll(FOCUSABLE))
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function open() {
      lastFocus = document.activeElement;
      menu.removeAttribute('hidden');
      // one frame so the transition runs from the closed position
      window.requestAnimationFrame(function () {
        menu.setAttribute('data-open', 'true');
      });
      document.body.setAttribute('data-menu-open', 'true');
      openers.forEach(function (button) {
        button.setAttribute('aria-expanded', 'true');
        // the burger is now a close button; saying "Open menu" would be a lie
        var closeLabel = button.getAttribute('data-label-close');
        if (closeLabel) button.setAttribute('aria-label', closeLabel);
      });
      var first = focusables()[0];
      if (first) first.focus();
    }

    function close() {
      menu.removeAttribute('data-open');
      document.body.removeAttribute('data-menu-open');
      openers.forEach(function (button) {
        button.setAttribute('aria-expanded', 'false');
        var openLabel = button.getAttribute('data-label-open');
        if (openLabel) button.setAttribute('aria-label', openLabel);
      });
      var done = function () {
        menu.setAttribute('hidden', '');
        menu.removeEventListener('transitionend', done);
      };
      // no transition (reduced motion) still has to hide it
      if (reduceMotion) done();
      else menu.addEventListener('transitionend', done);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function isOpen() {
      return menu.getAttribute('data-open') === 'true';
    }

    openers.forEach(function (button) {
      button.addEventListener('click', function () {
        if (isOpen()) close(); else open();
      });
    });
    closers.forEach(function (button) { button.addEventListener('click', close); });

    // a link inside the menu is a navigation: let it happen, but close first so
    // the panel is not left hanging when the browser restores this page
    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { close(); });
    });

    document.addEventListener('keydown', function (event) {
      if (!isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      var items = focusables();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });

    // leaving the tab while the menu is open would trap the next visit behind
    // a body that cannot scroll
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && isOpen()) close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 9b. COLLECTION VIEWS — grid ⇄ rack, on the same page                */
  /* ------------------------------------------------------------------ */
  function initCollectionViews() {
    var toggles = document.querySelectorAll('[data-view-toggle]');
    if (!toggles.length) return;

    var STORE_KEY = 'molfet:collection-view';
    var panels = document.querySelectorAll('[data-view-panel]');

    function show(view) {
      panels.forEach(function (panel) {
        var name = panel.getAttribute('data-view-panel');
        // The filter column belongs to the grid: a rail has nothing to filter.
        var mine = name === view || (name === 'filters' && view === 'grid');
        // `hidden` is what a screen reader honours; display:none alone leaves
        // the panel in the accessibility tree on some engines.
        if (mine) {
          panel.removeAttribute('hidden');
          panel.removeAttribute('data-rack-dormant');
        } else {
          panel.setAttribute('hidden', '');
          if (panel.hasAttribute('data-rack')) panel.setAttribute('data-rack-dormant', '');
        }
      });

      toggles.forEach(function (button) {
        var on = button.getAttribute('data-view-toggle') === view;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      // The rail parked at -9999px measures zero while hidden, so its thumb
      // and its drag maths are recalculated the moment it becomes visible.
      if (view === 'rack') {
        // `data-rack` sits on the panel itself, not on a child, so the selector
        // has to be a compound on the same element.
        var rail = document.querySelector('[data-view-panel="rack"][data-rack]') ||
                   document.querySelector('[data-view-panel="rack"] [data-rack]');
        if (rail) {
          initRackFor(rail);
          rail.dispatchEvent(new CustomEvent('molfet:rack-shown', { bubbles: true }));
        }
      }

      try { window.sessionStorage.setItem(STORE_KEY, view); } catch (error) {}
    }

    toggles.forEach(function (button) {
      button.addEventListener('click', function () {
        show(button.getAttribute('data-view-toggle'));
      });
    });

    // A link that asks for the rail directly (/collections/all?view=rack) is how
    // the header button lands on a working rail without a second page.
    var requested = '';
    try {
      requested = new URLSearchParams(window.location.search).get('view') || '';
    } catch (error) {}
    if (!requested) {
      try { requested = window.sessionStorage.getItem(STORE_KEY) || ''; } catch (error) {}
    }
    if (requested === 'rack' || requested === 'grid') show(requested);
  }

  /* ------------------------------------------------------------------ */
  /* 10. VARIANT PICKER — options resolve to the real variant            */
  /*     Without this, changing a size radio left the hidden id on the    */
  /*     first variant, which is how a size would silently never change.  */
  /* ------------------------------------------------------------------ */
  function initVariantPicker() {
    var form = document.getElementById('ProductForm');
    var dataNode = document.querySelector('[data-variant-json]');
    if (!form || !dataNode) return;

    var data;
    try {
      data = JSON.parse(dataNode.textContent);
    } catch (error) {
      return;
    }
    if (!data || !data.variants || !data.variants.length) return;

    var idInput = form.querySelector('[data-variant-id]');
    var stockNode = form.querySelector('[data-variant-stock]');
    var addButton = form.querySelector('[type=submit]');
    var wasNode = document.querySelector('[data-price-was]');
    var inStock = stockNode ? stockNode.textContent.trim() : '';
    var optionFields = form.querySelectorAll('.mf-option');

    function selectedValues() {
      var values = [];
      optionFields.forEach(function (field) {
        var checked = field.querySelector('input[type=radio]:checked');
        values.push(checked ? checked.value : '');
      });
      return values;
    }

    function findVariant(values) {
      return data.variants.find(function (variant) {
        return variant.options.every(function (option, index) {
          return !values[index] || option === values[index];
        });
      });
    }

    function sync() {
      var variant = findVariant(selectedValues());
      if (!variant) return;

      if (idInput) idInput.value = variant.id;

      if (stockNode) {
        var outLabel = stockNode.getAttribute('data-out') || stockNode.textContent.trim();
        stockNode.textContent = variant.available ? inStock : outLabel;
        stockNode.setAttribute('data-available', variant.available ? 'true' : 'false');
      }

      if (addButton) {
        addButton.disabled = !variant.available;
        addButton.textContent = variant.available
          ? form.getAttribute('data-add-label') || addButton.textContent
          : form.getAttribute('data-sold-label') || addButton.textContent;
      }

      if (wasNode && variant.price !== undefined) {
        if (variant.price >= (variant.compareAtPrice || 0)) wasNode.hidden = true;
      }

      // let the price blocks know (they re-read the marker, no polling)
      form.dispatchEvent(new CustomEvent('molfet:variant-change', { detail: variant, bubbles: true }));
    }

    form.addEventListener('change', function (event) {
      if (event.target.matches('input[type=radio]')) sync();
    });

    /* a variant URL (?variant=123) preselects the matching chips */
    var requested = new URLSearchParams(window.location.search).get('variant');
    if (requested) {
      var variant = data.variants.find(function (item) { return String(item.id) === String(requested); });
      if (variant) {
        optionFields.forEach(function (field) {
          var legend = field.querySelector('legend');
          if (!legend) return;
          var index = data.optionNames.indexOf(legend.textContent.trim());
          if (index === -1) return;
          var value = variant.options[index];
          field.querySelectorAll('input[type=radio]').forEach(function (input) {
            input.checked = input.value === value;
          });
        });
      }
    }

    sync();
  }

  /* ------------------------------------------------------------------ */
  /* 11. Concept imagery: one retry, then a different host                */
  /*     The theme's built-in photography is served from a CDN in front   */
  /*     of the repository. If that edge is unreachable — a blocked       */
  /*     network, an outage — the same file is fetched from GitHub's raw  */
  /*     host instead, so a garment never silently disappears.            */
  /* ------------------------------------------------------------------ */
  function initCdnFallback() {
    var CDN = 'https://cdn.jsdelivr.net/gh/sozykrb-dev/ergerg@';
    var RAW = 'https://raw.githubusercontent.com/sozykrb-dev/ergerg/';
    var SHA = 'fc6ca6497ae4a4799dd98e49ddb20c514197a28b';
    if (!document.querySelector('img[src*="jsdelivr"]')) return;

    document.addEventListener('error', function (event) {
      var img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.getAttribute('data-cdn-retried')) return;
      var src = img.getAttribute('src') || '';
      var swap = src
        .replace(CDN + SHA + '/public/', RAW + SHA + '/public/')
        .replace(CDN.replace(/\/$/, '') + '@' + SHA + '/public/', RAW + SHA + '/public/');
      if (swap === src) return;
      img.setAttribute('data-cdn-retried', 'true');
      img.setAttribute('src', swap);
    }, true);
  }

  /* ------------------------------------------------------------------ */
  /* Guard: if this file is ever evaluated twice (a duplicated asset tag, a
     cached copy, a section re-render), the second pass must not double-bind
     every handler — double listeners make the Mix toggle select then clear. */
  function boot() {
    if (window.MOLFET_BOUND) return;
    window.MOLFET_BOUND = true;
    initHeader();
    initCart();
    initLens();
    initDetailPanel();
    initMix();
    initLoader();
    initMisc();
    initFrameBreak();
    initAddToCart();
    initMenu();
    initRack();
    initCollectionViews();
    initVariantPicker();
    initCdnFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
