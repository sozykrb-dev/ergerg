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

  function initRackFor(root) {
    if (!root || rackSeen(root)) return;
    rackMark(root);

    var ring = root.querySelector('[data-circle-ring]');
    var stage = root.querySelector('[data-circle-stage]');
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-circle-item]'));
    var dotsBox = root.querySelector('[data-circle-dots]');
    var frontLink = root.querySelector('[data-circle-front]');
    var indexEl = root.querySelector('[data-circle-index]');
    var totalEl = root.querySelector('[data-circle-total]');
    var priceEl = root.querySelector('[data-circle-price]');
    if (!ring || !items.length) return;

    var count = items.length;
    var active = 0;
    var current = 0;       // where the ring is, in "items"
    var target = 0;        // where it was asked to go
    var rtl = document.documentElement.dir === 'rtl';

    // the scroll distance for one full turn: roughly one screen, so a wheel on
    // a desktop and a finger on a phone both cover the ring in a few gestures
    var turnSpan = 0;

    function measure() {
      turnSpan = Math.max(320, window.innerHeight * 0.85);
      root.style.setProperty('--mf-ring-span', turnSpan + 'px');
      // step is tighter for a big ring and looser for a small one, so the ends
      // never overlap and the front never has a gap around it
      var step = Math.min(CIRCLE_STEP, 320 / Math.max(count, 1));
      root.style.setProperty('--mf-ring-step', step.toFixed(2) + 'deg');
      var radius = Math.max(220, (stage && stage.clientWidth ? stage.clientWidth : 720) * 0.42);
      root.style.setProperty('--mf-ring-radius', radius.toFixed(0) + 'px');
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function render() {
      ring.style.transform = 'rotateY(' + (-current * parseFloat(
        (root.style.getPropertyValue('--mf-ring-step') || '36').replace('deg', ''))) + 'deg)';

      var nearest = Math.round(current);
      var wrapped = ((nearest % count) + count) % count;
      // index `count` is the same piece as index 0: the ring closed the loop
      if (wrapped !== active) {
        active = wrapped;
        var product = items[active];
        if (frontLink) {
          var anchor = product.querySelector('a');
          if (anchor) {
            frontLink.setAttribute('href', anchor.getAttribute('href'));
            frontLink.textContent = anchor.querySelector('img')
              ? anchor.querySelector('img').getAttribute('alt')
              : frontLink.textContent;
          }
        }
        if (indexEl) indexEl.textContent = pad(active + 1);
        if (priceEl) {
          var price = product.getAttribute('data-price');
          priceEl.textContent = price || '';
        }
        dotsBox && Array.prototype.forEach.call(dotsBox.children, function (dot, i) {
          dot.setAttribute('data-active', i === active ? 'true' : 'false');
        });
        items.forEach(function (item, i) {
          item.setAttribute('data-front', i === active ? 'true' : 'false');
        });
      }

      // opacity by depth: the front is solid, the far side fades into the ring
      items.forEach(function (item, i) {
        var offset = Math.abs((((i - current) % count) + count * 1.5) % count - count / 2);
        item.style.opacity = offset > count / 2.2 ? '.25' : '';
      });
    }

    /* The ring is turned by writing `current`, and CSS animates the change.
       The browser's easing is smoother than a hand-rolled spring, it costs no
       frames, and it lands exactly on the target — the frame loop this replaces
       settled a degree short and left the ring visibly off-centre. */
    function go(n) {
      target = n;
      current = n;
      render();
    }

    function step(direction) {
      // snap to the next whole piece from wherever the ring actually is
      go(Math.round(target) + direction);
    }

    /* --- dots: one per piece, so the ring has a length --- */
    // Built once. A rail that is re-initialised (the collection toggle) would
    // otherwise stack a second set of dots on top of the first.
    if (dotsBox && !dotsBox.children.length) {
      for (var dotIndex = 0; dotIndex < count; dotIndex++) {
        var dot = document.createElement('span');
        dot.className = 'mf-circle__dot';
        dot.setAttribute('data-active', dotIndex === 0 ? 'true' : 'false');
        dotsBox.appendChild(dot);
      }
    }
    if (totalEl) totalEl.textContent = pad(count);
    if (indexEl) indexEl.textContent = pad(1);

    // the first piece faces the viewer before anything turns, so the ring has a
    // front from the first frame instead of waiting for the first scroll
    items.forEach(function (item, i) {
      item.setAttribute('data-front', i === 0 ? 'true' : 'false');
      if (i === 0) {
        var anchor = item.querySelector('a');
        if (frontLink && anchor) {
          frontLink.setAttribute('href', anchor.getAttribute('href'));
          var img = anchor.querySelector('img');
          if (img) frontLink.textContent = img.getAttribute('alt');
        }
        if (priceEl) priceEl.textContent = item.getAttribute('data-price') || '';
      }
    });

    /* --- scrolling turns the ring ------------------------------------
       On a phone the section is pinned and the page's own scroll is the
       control; on a desktop the wheel over the stage is. Both feed the same
       target, so the two can never disagree about where the ring is. */
    function fromScroll() {
      /* The panel is pinned by CSS: its top is held at 0 while its own height
         is being scrolled through. `data-ring-start` is where that stretch
         begins in the document, so the ring turns from 0 to a full loop across
         exactly that distance and then stops — the page carries on after. */
      var start = parseFloat(root.getAttribute('data-ring-start'));
      if (isNaN(start)) {
        var box = root.getBoundingClientRect();
        start = (window.scrollY || window.pageYOffset) + box.top;
        root.setAttribute('data-ring-start', String(start));
      }
      var travelled = (window.scrollY || window.pageYOffset) - start;
      if (travelled <= 0) { go(0); return; }
      /* One span = one complete turn. Using `count` rather than `count - 1`
         makes the ring come back to the piece it started on, so the loop closes
         instead of stopping one short and looking broken. */
      if (travelled >= turnSpan) { go(count); return; }
      go(travelled / turnSpan * count);
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        // a ring inside a hidden panel has no geometry worth reading
        if (root.closest('[hidden]')) return;
        fromScroll(window.scrollY || window.pageYOffset);
      });
    }, { passive: true });

    /* --- dragging it ------------------------------------------------ */
    var drag = null;
    if (stage) {
      stage.addEventListener('pointerdown', function (event) {
        if (event.target.closest('button, a')) return;
        drag = { x: event.clientX, base: target, moved: false };
        stage.setPointerCapture && stage.setPointerCapture(event.pointerId);
      });
      stage.addEventListener('pointermove', function (event) {
        if (!drag) return;
        var dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) < 6) return;
        drag.moved = true;
        stage.setAttribute('data-dragging', 'true');
        go(drag.base + (rtl ? dx : -dx) / 90);
      });
      function release(event) {
        if (stage.hasPointerCapture && event && stage.hasPointerCapture(event.pointerId)) {
          stage.releasePointerCapture(event.pointerId);
        }
        if (!drag) return;
        stage.removeAttribute('data-dragging');
        if (drag.moved) go(Math.round(target));
        drag = null;
      }
      stage.addEventListener('pointerup', release);
      stage.addEventListener('pointercancel', release);
      stage.addEventListener('pointerleave', release);

      stage.addEventListener('wheel', function (event) {
        if (event.ctrlKey) return;
        var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!delta) return;
        // a wheel over the ring turns it, one notch at a time
        event.preventDefault();
        go(Math.round(target) + (delta > 0 ? 1 : -1));
      }, { passive: false });
    }

    var prev = root.querySelector('[data-circle-prev]');
    var next = root.querySelector('[data-circle-next]');
    if (prev) prev.addEventListener('click', function () { step(rtl ? 1 : -1); });
    if (next) next.addEventListener('click', function () { step(rtl ? -1 : 1); });

    root.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); step(rtl ? -1 : 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(rtl ? 1 : -1); }
    });

    window.addEventListener('resize', function () { measure(); render(); });

    measure();
    render();
  }

  function initRack() {
    document.querySelectorAll('[data-rack]').forEach(function (root) {
      if (root.closest('[hidden]')) return;
      initRackFor(root);
    });
  }

  function initRack() {
    document.querySelectorAll('[data-rack]').forEach(function (root) {
      // a rail inside a hidden panel is initialised when it is revealed, not now
      if (root.closest('[hidden]')) return;
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
