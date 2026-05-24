/**
 * GROW, EAT, SUSTAIN - Advanced Motion Design System
 * IntersectionObserver reveal engine + custom premium smooth scrolling.
 *
 * BEGINNER WALKTHROUGH:
 * This file is the main "motion controller" for the whole website.
 * HTML creates the page content, CSS decides how things look, and this
 * JavaScript decides when special effects should start.
 *
 * Think of this file like a stage manager:
 * - It waits until the page has loaded.
 * - It finds important elements such as headings, cards, buttons, images,
 *   videos, and navigation links.
 * - It adds CSS classes to those elements so the CSS can animate them.
 * - It watches scrolling so elements reveal themselves only when they enter
 *   the visible screen.
 * - It creates decorative leaves dynamically, meaning the leaves are added by
 *   code instead of being hard-coded into every HTML page.
 * - It improves navigation by making anchor-link jumps feel smooth.
 *
 * IMPORTANT ARCHITECTURE IDEA:
 * This file does not draw animations directly with JavaScript. Instead, it
 * mostly adds classes and CSS variables. The CSS file `motion.css` reads those
 * classes/variables and performs the visual movement. This keeps the site
 * organized: JavaScript handles behavior, CSS handles appearance.
 */

(() => {
  // ======================================================
  // PRIVATE SCRIPT WRAPPER
  // ======================================================
  //
  // PURPOSE:
  // The entire file is wrapped inside an arrow function that immediately runs.
  //
  // WHY THIS EXISTS:
  // Variables like `doc`, `root`, and `activeScrollFrame` should belong only
  // to this animation system. Without this wrapper, those names would become
  // global variables and could accidentally conflict with other scripts.
  //
  // HOW IT WORKS:
  // 1. `(() => { ... })` creates a function.
  // 2. The final `()` runs that function immediately.
  // 3. Everything inside stays private to this file.
  //
  // BEGINNER ANALOGY:
  // Think of this like putting tools inside a toolbox. Other parts of the
  // website can still enjoy the result, but they cannot accidentally knock the
  // tools off the table.

  'use strict';
  // `use strict` asks JavaScript to be less forgiving about mistakes.
  // For example, it prevents accidentally creating global variables by typo.

  const doc = document;
  // `document` is the browser's object for the current HTML page.
  // Saving it as `doc` is a short alias used throughout this file.

  const root = doc.documentElement;
  // `document.documentElement` is the <html> element.
  // This is useful because classes placed on <html> can affect the whole page.

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  // This asks the browser whether the user has requested reduced motion in
  // their operating system/browser accessibility settings.
  // If true, the site should avoid large animated movement.

  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  // This checks whether the device has a precise pointer that can hover,
  // such as a mouse or trackpad. Touch screens usually cannot hover precisely,
  // so magnetic hover effects are skipped on those devices.

  // ======================================================
  // REVEAL TARGET SELECTOR LIST
  // ======================================================
  //
  // PURPOSE:
  // These selectors tell JavaScript which page elements should animate into view.
  //
  // WHY THIS EXISTS:
  // The site has several pages with different HTML, but they share common
  // patterns: nav links, headings, sections, cards, figures, videos, and
  // action blocks. This list lets one animation system support all pages.
  //
  // HOW THE BROWSER USES IT:
  // Later, `querySelectorAll(revealSelector)` searches the document for every
  // element matching any selector in this comma-separated list.
  const revealSelector = [
    '.site-nav .brand',                 // The site logo/name inside the navigation bar.
    '.nav-links a',                     // Every navigation link, including top nav and floating nav links.
    '.nav-actions .btn',                // The "Get Involved" action button in the navigation area.
    'header > .container > h1',         // Main page title inside a header container.
    'header > .container > p',          // Header intro text or eyebrow text.
    'main > section > h2',              // Section headings such as "Food Import".
    'main > section > p',               // Intro paragraphs directly inside a section.
    'main > section > article',         // Content article blocks.
    'main > section > figure',          // Images with captions directly inside sections.
    'main > section > .responsive-media', // Video/media wrappers directly inside sections.
    'section > div',                    // Generic section child divs such as grids.
    '.video-grid > article',            // Video cards inside the home page Learn More section.
    '.card',                            // Generic card components.
    '.pap-card',                        // Personal Action Plan cards.
    '.profile',                         // About/profile cards if used.
    '.action'                           // Get Involved action cards.
  ].join(',');
  // `.join(',')` turns the array into one CSS selector string separated by
  // commas, exactly the format `querySelectorAll` expects.

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  // `clamp` keeps a number inside a safe range.
  // Example: clamp(200, 0, 100) becomes 100.
  // This prevents animation math from moving elements too far.

  const prefersReducedMotion = () => reduceMotionQuery.matches;
  // This small helper returns true when the user prefers less motion.
  // Using a function keeps the rest of the code readable.

  // ======================================================
  // PAGE READY HELPER
  // ======================================================
  //
  // PURPOSE:
  // Run code after the HTML has loaded, so querySelector can find the elements.
  //
  // WHY THIS EXISTS:
  // JavaScript can run before the browser has finished reading the HTML.
  // If we search too early, elements like sections and buttons may not exist yet.
  //
  // INPUT:
  // `callback` is a function that should run when the page is ready.
  //
  // OUTPUT:
  // No returned visual value. It either schedules or immediately runs callback.
  const onReady = (callback) => {
    if (doc.readyState === 'loading') {
      // If the document is still loading, wait for the DOMContentLoaded event.
      doc.addEventListener('DOMContentLoaded', callback, { once: true });
      // `{ once: true }` automatically removes the listener after it runs once.
      // This avoids keeping unnecessary event listeners in memory.
      return;
    }

    // If the document is already ready, run the callback immediately.
    callback();
  };

  // ======================================================
  // UNIQUE ELEMENT FINDER
  // ======================================================
  //
  // PURPOSE:
  // Turn a selector into an array and remove duplicates.
  //
  // WHY THIS EXISTS:
  // Some elements match multiple selectors. For example, an article can also be
  // inside a grid. `Set` keeps only one copy of each element so we do not apply
  // the same animation setup repeatedly.
  const uniqueElements = (selector) => {
    return Array.from(new Set(doc.querySelectorAll(selector)));
    // `querySelectorAll` returns a NodeList, which is array-like but not a true
    // array. `Array.from` converts it so we can use array methods safely.
  };

  // ======================================================
  // REVEAL TYPE CLASS ASSIGNMENT
  // ======================================================
  //
  // PURPOSE:
  // Add extra classes that tell CSS which animation style each element should use.
  //
  // WHY THIS EXISTS:
  // Not every element should animate the same way. A nav link should move only
  // a little, while a section heading can have a bigger cinematic reveal.
  //
  // INPUT:
  // `element` is one HTML element already selected from the page.
  //
  // OUTPUT:
  // The function does not return data. It changes the element by adding classes.
  const addRevealType = (element) => {
    if (element.matches('.site-nav, .site-nav .brand, .nav-links a, .nav-actions .btn')) {
      element.classList.add('reveal-nav');
      // `reveal-nav` tells CSS to use a smaller, quicker reveal suitable for navigation.
    }

    if (element.matches('main > section > h2, main > section > p, header > .container > h1, header > .container > p')) {
      element.classList.add('reveal-section');
      // `reveal-section` gives major headings/intro text a stronger entrance.
    }

    if (element.matches('article, figure, section > div, .responsive-media, .video-grid > article, .card, .pap-card, .profile, .action')) {
      element.classList.add('reveal-card');
      // `reveal-card` makes block-like content fade and lift in like a premium card.
    }

    if (element.matches('figure, .responsive-media')) {
      element.classList.add('reveal-image');
      // `reveal-image` is used for media that can also receive parallax movement.
    }

    if (element.matches('h1, h2, h3, p, li')) {
      element.classList.add('reveal-text');
      // `reveal-text` uses a subtler reveal so text stays easy to read.
    }
  };

  // ======================================================
  // STAGGER DELAY HELPER
  // ======================================================
  //
  // PURPOSE:
  // Stagger delay means items animate one after another instead of all at once.
  //
  // BEGINNER ANALOGY:
  // Imagine people entering a room one by one instead of all squeezing through
  // the door at the same time. Staggering creates that ordered, polished feel.
  //
  // INPUTS:
  // - element: the HTML element receiving the delay.
  // - index: its position in a list or grid.
  // - step: how much delay is added per item.
  // - maxDelay: the longest delay allowed.
  const applyDelayClass = (element, index, step = 100, maxDelay = 600) => {
    const delay = Math.min(index * step, maxDelay);
    // Example: index 3 with step 100 becomes 300ms.
    // `Math.min` prevents extremely long lists from creating huge delays.

    element.style.setProperty('--stagger-delay', `${delay}ms`);
    // This writes a CSS custom property directly on the element.
    // CSS then reads `--stagger-delay` as the animation delay.

    if (index > 0 && index <= 5) {
      element.classList.add(`reveal-delay-${index}`);
      // The class provides a fallback/extra named delay for the first few items.
    }
  };

  // ======================================================
  // DIRECT CHILD FILTER
  // ======================================================
  //
  // PURPOSE:
  // Get only direct children that match a selector.
  //
  // WHY THIS EXISTS:
  // Sometimes we want list items directly inside one list, not nested content
  // deeper inside that list. `container.children` only gives direct children.
  const childrenMatching = (container, selector) => {
    return Array.from(container.children).filter((child) => child.matches(selector));
  };

  // ======================================================
  // STAGGER ANIMATION SYSTEM
  // ======================================================
  //
  // PURPOSE:
  // This system gives groups of elements their own reveal timing so the page
  // feels intentional rather than mechanical.
  //
  // WHY THIS EXISTS:
  // If every paragraph, card, and list item appeared at the exact same instant,
  // the motion would look flat. Staggering creates rhythm.
  //
  // HOW IT WORKS:
  // 1. Find lists, grids, sections, and nav links.
  // 2. Add helper classes such as `stagger-children` and `reveal-child`.
  // 3. Store each element's delay in `--stagger-delay`.
  // 4. CSS uses that delay when the element becomes visible.
  const initStaggerAnimations = () => {
    // Animate list items one by one.
    uniqueElements('ul, ol').forEach((list) => {
      list.classList.add('stagger-children');
      childrenMatching(list, 'li').forEach((item, index) => {
        item.classList.add('reveal-child', 'reveal-text');
        applyDelayClass(item, index, 55, 275);
      });
    });

    // Animate card/grid children one by one.
    uniqueElements('.video-grid, .cards, .pap-grid, .team-grid, .actions-grid').forEach((grid) => {
      grid.classList.add('stagger-children');
      Array.from(grid.children).forEach((child, index) => {
        child.classList.add('reveal-item', 'reveal-card');
        applyDelayClass(child, index, 70, 320);
      });
    });

    // Give each major section child a small delay.
    uniqueElements('main > section').forEach((section) => {
      childrenMatching(section, 'article, figure, .responsive-media, h2, p').forEach((child, index) => {
        applyDelayClass(child, index, 60, 300);
      });
    });

    uniqueElements('article > h3, article > p, section > div > h3, figure > figcaption, .video-grid > article > h3').forEach((child, index) => {
      child.classList.add('reveal-child', 'reveal-text');
      applyDelayClass(child, (index % 5) + 1, 45, 225);
    });

    uniqueElements('.nav-links a, .nav-actions .btn').forEach((item, index) => {
      applyDelayClass(item, index + 1, 40, 200);
    });
  };

  // ======================================================
  // INTERSECTION OBSERVER REVEAL SYSTEM
  // ======================================================
  //
  // PURPOSE:
  // This system reveals elements when they scroll into view.
  //
  // BEGINNER ANALOGY:
  // Think of IntersectionObserver like a camera watching the page. When an
  // element enters the camera view, the browser tells us, and we add a class
  // that lets CSS animate it.
  //
  // WHY THIS EXISTS:
  // It is more efficient than constantly checking scroll position manually.
  // The browser can optimize observation internally, which improves performance.
  //
  // HOW IT WORKS:
  // 1. Add `motion-enabled` to <html> so motion CSS becomes active.
  // 2. Find every reveal target.
  // 3. Add base reveal classes.
  // 4. If reduced motion is enabled, show everything immediately.
  // 5. Otherwise, observe each element and reveal it as it enters the viewport.
  const initScrollReveal = () => {
    // This class turns on the CSS reveal system.
    root.classList.add('motion-enabled');

    // Find all elements that should be revealed as the user scrolls.
    let revealElements = uniqueElements(revealSelector).filter((element) => {
      return !element.closest('script, style, noscript');
    });

    revealElements.forEach((element) => {
      element.classList.add('reveal-item');
      addRevealType(element);
    });

    initStaggerAnimations();

    revealElements = uniqueElements('.reveal-item').filter((element) => {
      return !element.closest('script, style, noscript');
    });

    revealElements.forEach(addRevealType);

    // ======================================================
    // IMMEDIATE FIRST-SECTION VISIBILITY
    // ======================================================
    //
    // PURPOSE:
    // The first content section on the Home page should be readable immediately
    // when the website opens.
    //
    // WHY THIS EXISTS:
    // The normal reveal system waits for scroll/viewport observation before
    // showing content. That is nice for later sections, but the opening
    // "Details About Sustainable Food" content should not feel like it only
    // appears after the user scrolls.
    //
    // HOW IT WORKS:
    // Any reveal element inside the first main section gets the same visible
    // classes that IntersectionObserver would normally add later.
    const firstMainSection = doc.querySelector('main > section:first-of-type');

    if (firstMainSection) {
      uniqueElements('main > section:first-of-type .reveal-item, main > section:first-of-type .reveal-child').forEach((element) => {
        const videoArticle = element.closest('article');
        const belongsToVideoBlock = element.matches('.responsive-media, .responsive-media *') ||
          (videoArticle && videoArticle.querySelector('.responsive-media'));

        if (belongsToVideoBlock) {
          return;
        }

        element.classList.add('reveal-visible', 'visible', 'active');
      });
    }

    root.classList.remove('motion-preload');

    // If the user prefers less motion, show everything immediately.
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      root.classList.add('motion-reduced');
      revealElements.forEach((element) => {
        element.classList.add('reveal-visible', 'visible', 'active');
      });
      return;
    }

    const pending = new Set();
    // `pending` temporarily stores elements that should become visible.
    // A Set avoids duplicates if the observer reports the same element twice.

    let frame = 0;
    // `frame` stores the requestAnimationFrame id so we schedule only one
    // visual update per browser frame.

    const flush = () => {
      pending.forEach((element) => {
        element.classList.add('reveal-visible', 'visible', 'active');
        // These classes are the "go" signal for CSS transitions/animations.
      });
      pending.clear();
      frame = 0;
    };

    // IntersectionObserver watches elements and tells us when they enter the screen.
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        pending.add(entry.target);
        activeObserver.unobserve(entry.target);
      });

      if (!frame && pending.size) {
        frame = window.requestAnimationFrame(flush);
      }
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -12% 0px'
    });

    window.requestAnimationFrame(() => {
      revealElements.forEach((element) => observer.observe(element));
    });
  };

  // ======================================================
  // SMOOTH SCROLL SYSTEM
  // ======================================================
  //
  // PURPOSE:
  // This system creates animated scrolling when users click navigation links
  // that point to sections on the same page.
  //
  // WHY THIS EXISTS:
  // The default browser jump can feel abrupt. Smooth scrolling gives the site a
  // calmer, more premium experience and helps users understand where they moved.
  //
  // HOW IT WORKS:
  // 1. Detect clicks on links containing "#".
  // 2. Convert the link hash into a real section element.
  // 3. Prevent the browser's instant jump.
  // 4. Animate `window.scrollTo` frame by frame.
  // 5. Focus the destination section for keyboard/accessibility support.
  //
  // PERFORMANCE NOTE:
  // requestAnimationFrame syncs scroll updates with the browser's paint cycle,
  // which makes the animation smoother than using setInterval.
  let activeScrollFrame = 0;
  // Stores the currently running scroll animation frame.
  // If the user starts another scroll, the old one can be cancelled cleanly.

  let ignoreFloatingNavScrollUpdates = false;
  // Temporarily prevents the floating nav from fighting the smooth-scroll click.
  // This avoids the active indicator jumping while the animated scroll is still moving.

  // Make page paths easier to compare, so /index.html and / count as the same page.
  const normalizePath = (path) => {
    return path.replace(/\/index\.html$/i, '/').replace(/\/$/, '');
    // This makes `/Index/index.html` and `/Index/` easier to compare.
  };

  // The sticky nav covers the top of the page, so scrolling needs an offset.
  const getStickyOffset = () => {
    const nav = doc.querySelector('.site-nav');
    // Finds the sticky top navigation if it exists.
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    // `getBoundingClientRect().height` measures the actual rendered height.
    // This matters because responsive navigation can be taller on small screens.
    return Math.round(navHeight + 18);
    // The extra 18px creates comfortable breathing room above the target section.
  };

  // Easing changes scroll progress so it starts fast and slows gently.
  const easeOutCinematic = (t) => {
    return 1 - Math.pow(1 - t, 3);
    // When t goes from 0 to 1, this formula moves quickly at first and then
    // slows near the end. That gentle landing feels more cinematic.
  };

  // Convert a clicked hash link, like #details, into the matching section element.
  const targetFromLink = (link) => {
    const rawHref = link.getAttribute('href');
    // Reads the raw href exactly as written in HTML, such as "#details".

    if (!rawHref || rawHref === '#') {
      return null;
    }

    let url;
    try {
      url = new URL(rawHref, window.location.href);
      // `new URL` safely resolves relative links using the current page URL.
    } catch {
      return null;
      // If the href is invalid, ignore it instead of throwing an error.
    }

    const samePage = url.origin === window.location.origin &&
      normalizePath(url.pathname) === normalizePath(window.location.pathname);
    // Only same-page hash links should trigger smooth scrolling.
    // Links to other pages should behave normally.

    if (!samePage || !url.hash) {
      return null;
    }

    let id = url.hash.slice(1);
    // Removes the "#" character so "#details" becomes "details".

    try {
      id = decodeURIComponent(id);
      // Converts encoded characters back to normal text if needed.
    } catch {
      return null;
    }

    return doc.getElementById(id);
    // Finds the actual section element with the matching id.
  };

  // Smoothly scroll to a section using requestAnimationFrame.
  const smoothScrollTo = (target) => {
    if (prefersReducedMotion()) {
      target.scrollIntoView();
      // Respect accessibility settings: jump normally instead of animating.
      return 0;
    }

    if (activeScrollFrame) {
      window.cancelAnimationFrame(activeScrollFrame);
      // Stop any previous smooth scroll before starting a new one.
    }

    const startY = window.scrollY || window.pageYOffset;
    // Current vertical scroll position.

    const targetY = Math.max(
      0,
      target.getBoundingClientRect().top + startY - getStickyOffset()
    );
    // Target page position:
    // - target's position inside the viewport
    // - plus current scroll position
    // - minus sticky navigation height
    // `Math.max(0, ...)` prevents trying to scroll above the top of the page.

    const distance = targetY - startY;
    // How far the page needs to travel.

    const duration = clamp(Math.abs(distance) * 0.15, 120, 280);
    // Longer distances get slightly longer animations, but the clamp keeps the
    // duration between 120ms and 280ms so it never feels too slow or too abrupt.

    const startTime = performance.now();
    // High-precision timestamp used to calculate animation progress.

    root.classList.add('is-smooth-scrolling');

    const step = (now) => {
      const elapsed = now - startTime;
      // Time passed since the animation began.
      const progress = clamp(elapsed / duration, 0, 1);
      // Converts elapsed time into a 0-to-1 progress value.
      const eased = easeOutCinematic(progress);
      // Applies cinematic easing to avoid robotic linear movement.

      window.scrollTo(0, startY + distance * eased);
      // Moves the window to the next calculated scroll position.

      if (progress < 1) {
        activeScrollFrame = window.requestAnimationFrame(step);
        return;
      }

      activeScrollFrame = 0;
      root.classList.remove('is-smooth-scrolling');
      target.setAttribute('tabindex', '-1');
      // Makes the section temporarily focusable even if it is not normally focusable.
      target.focus({ preventScroll: true });
      // Moves keyboard focus to the target for accessibility without causing
      // another scroll jump.
    };

    activeScrollFrame = window.requestAnimationFrame(step);
    return duration;
  };

  const initSmoothScroll = () => {
    // Listen for clicks on links that contain # and scroll to the matching section.
    doc.addEventListener('click', (event) => {
      const link = event.target.closest('a[href*="#"]');

      if (!link) {
        return;
      }

      const target = targetFromLink(link);

      if (!target) {
        return;
      }

      event.preventDefault();
      const duration = smoothScrollTo(target);

      if (link.closest('.floating-page-nav')) {
        ignoreFloatingNavScrollUpdates = true;
        window.setTimeout(() => {
          ignoreFloatingNavScrollUpdates = false;
        }, duration + 80);
      }

      if (target.id) {
        history.pushState(null, '', `#${encodeURIComponent(target.id)}`);
      }
    });
  };

  // ======================================================
  // FLOATING NAVIGATION ACTIVE TRACKING
  // ======================================================
  //
  // PURPOSE:
  // This system keeps the floating section navigation in sync with the section
  // currently being viewed.
  //
  // WHY THIS EXISTS:
  // On long pages, users need orientation. Active nav styling works like a
  // "you are here" marker.
  //
  // HOW IT WORKS:
  // 1. Find every `.floating-page-nav`.
  // 2. Match each link to the section it points to.
  // 3. Watch sections with IntersectionObserver when available.
  // 4. Use scroll-position math as a fallback/helper.
  // 5. Move CSS indicator variables to the active link.
  const initFloatingNavigation = () => {
    // Floating navs are the side/bottom menus that jump to page sections.
    const navs = uniqueElements('.floating-page-nav');

    if (!navs.length) {
      return;
    }

    const mobileNavQuery = window.matchMedia('(max-width: 768px)');
    // The floating nav changes shape on mobile. This query lets JavaScript
    // position the active indicator horizontally on mobile and vertically on desktop.

    // Build a list of nav links and the page sections they point to.
    const configs = navs.map((nav) => {
      const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
      // Only links starting with "#" point to sections on the current page.
      const items = links.map((link) => ({
        link,
        target: targetFromLink(link)
        // Store the link together with the section it controls.
      })).filter((item) => item.target);
      // Remove links that do not point to a real section.

      return {
        nav,
        items,
        activeLink: null
      };
    }).filter((config) => config.items.length);

    if (!configs.length) {
      return;
    }

    // Move the active indicator to the current nav link.
    const updateIndicator = (config, link) => {
      if (!link) {
        return;
      }

      window.requestAnimationFrame(() => {
        if (mobileNavQuery.matches) {
          config.nav.style.setProperty('--floating-nav-active-left', `${link.offsetLeft}px`);
          // On mobile, the floating nav is a horizontal bar, so the indicator
          // needs a left position.
          config.nav.style.setProperty('--floating-nav-active-width', `${link.offsetWidth}px`);
          // The indicator width matches the active link width.
          return;
        }

        config.nav.style.setProperty('--floating-nav-active-top', `${link.offsetTop}px`);
        // On desktop, the floating nav is vertical, so the indicator moves down/up.
        config.nav.style.setProperty('--floating-nav-active-height', `${link.offsetHeight}px`);
        // The indicator height matches the active link height.
      });
    };

    // Mark one nav link as active and remove active styling from the others.
    const setActive = (config, activeLink) => {
      if (!activeLink || config.activeLink === activeLink) {
        updateIndicator(config, activeLink);
        return;
      }

      config.items.forEach(({ link }) => {
        link.classList.toggle('is-active', link === activeLink);
        // Adds `is-active` only to the current link and removes it from others.

        if (link === activeLink) {
          link.setAttribute('aria-current', 'true');
          // `aria-current` tells screen readers this link represents the current section.
        } else {
          link.removeAttribute('aria-current');
        }
      });

      config.activeLink = activeLink;
      config.nav.classList.add('has-active');
      updateIndicator(config, activeLink);
    };

    // Choose the active nav link based on a section element.
    const setActiveFromSection = (section) => {
      configs.forEach((config) => {
        const item = config.items.find(({ target }) => target === section);

        if (item) {
          setActive(config, item.link);
        }
      });
    };

    // Fallback method: choose the section closest to the middle of the screen.
    const updateByScrollPosition = () => {
      const anchorY = window.scrollY + window.innerHeight * 0.42;
      // This invisible anchor point sits a little above the screen center.
      // The nearest section to this point becomes active.

      configs.forEach((config) => {
        let bestItem = config.items[0];
        let bestDistance = Number.POSITIVE_INFINITY;

        config.items.forEach((item) => {
          const rect = item.target.getBoundingClientRect();
          // Measures where the target section is in the viewport right now.
          const top = rect.top + window.scrollY;
          // Converts viewport position into full-page position.
          const bottom = top + rect.height;
          // Full-page bottom position of the section.
          const distance = anchorY >= top && anchorY <= bottom
            ? 0
            : Math.min(Math.abs(anchorY - top), Math.abs(anchorY - bottom));
          // If the anchor is inside the section, distance is 0.
          // Otherwise, use the nearest edge distance.

          if (distance < bestDistance) {
            bestDistance = distance;
            bestItem = item;
          }
        });

        setActive(config, bestItem.link);
      });
    };

    if ('IntersectionObserver' in window) {
      // Watch sections and update the floating nav as sections become visible.
      const sectionToLink = new Map();
      // Map is useful here because it pairs each section element with its nav link.
      configs.forEach((config) => {
        config.items.forEach((item) => {
          sectionToLink.set(item.target, item.link);
          // Example: <section id="details"> -> <a href="#details">.
        });
      });

      const activeObserver = new IntersectionObserver((entries) => {
        if (ignoreFloatingNavScrollUpdates) {
          return;
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.3)
          // Keep only sections that are at least 30% visible.
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          // Most visible section wins.

        if (visible[0]) {
          const link = sectionToLink.get(visible[0].target);

          if (link) {
            setActiveFromSection(visible[0].target);
          }
        }
      }, {
        threshold: [0.3, 0.4, 0.5],
        rootMargin: '-10% 0px -32% 0px'
      });

      configs.forEach((config) => {
        config.items.forEach(({ target }) => activeObserver.observe(target));
      });
    }

    let scrollFrame = 0;
    // Prevents doing scroll math more than once per animation frame.
    let idleTimer = 0;
    // Used to add an idle class after the user stops scrolling.

    const updateNavVisibility = () => {
      // Show the floating nav after the user scrolls down a little.
      const isVisible = window.scrollY > 60;
      // Show the floating nav only after the user has moved down slightly.

      configs.forEach((config) => {
        config.nav.classList.toggle('is-visible', isVisible);
        config.nav.classList.remove('is-idle');
      });

      window.clearTimeout(idleTimer);
      // Restart the idle timer every time scrolling happens.
      idleTimer = window.setTimeout(() => {
        configs.forEach((config) => config.nav.classList.add('is-idle'));
      }, 1500);
      // After 1.5 seconds without scroll updates, mark nav as idle.
    };

    const onScroll = () => {
      // requestAnimationFrame avoids doing heavy work on every tiny scroll event.
      if (scrollFrame) {
        return;
      }

      scrollFrame = window.requestAnimationFrame(() => {
        if (!ignoreFloatingNavScrollUpdates) {
          updateByScrollPosition();
        }
        updateNavVisibility();
        scrollFrame = 0;
      });
    };

    configs.forEach((config) => {
      config.items.forEach(({ link }) => {
        link.addEventListener('click', () => setActive(config, link));
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      configs.forEach((config) => updateIndicator(config, config.activeLink));
    });

    updateByScrollPosition();
    updateNavVisibility();
  };

  // ======================================================
  // MAGNETIC HOVER INTERACTIONS
  // ======================================================
  //
  // PURPOSE:
  // This system makes buttons and nav links subtly follow the mouse pointer.
  //
  // BEGINNER ANALOGY:
  // Imagine the cursor has a tiny magnet inside it. When it passes over a
  // button, the button leans slightly toward the cursor.
  //
  // HOW IT WORKS:
  // 1. Listen for pointer movement over interactive elements.
  // 2. Measure the pointer position relative to the element center.
  // 3. Store small x/y offsets in CSS variables.
  // 4. CSS uses those variables inside `transform`.
  //
  // ACCESSIBILITY:
  // The effect is skipped for reduced-motion users and touch-only devices.
  const initMagneticHover = () => {
    // Skip hover effects on touch devices or when reduced motion is preferred.
    if (prefersReducedMotion() || !finePointerQuery.matches) {
      return;
    }

    uniqueElements('.btn, .cta-button, button, .nav-links a, body.motion-page-involved .action').forEach((element) => {
      let frame = 0;

      // Update CSS variables so the button slightly follows the cursor.
      const update = (event) => {
        // `event.clientX` and `event.clientY` are the mouse coordinates inside
        // the browser viewport.
        if (frame) {
          return;
        }

        frame = window.requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          // The rectangle gives the element's current position and size.
          const x = (event.clientX - (rect.left + rect.width / 2)) * 0.14;
          // Horizontal distance from the element center, softened to 14%.
          const y = (event.clientY - (rect.top + rect.height / 2)) * 0.22;
          // Vertical distance from the element center, softened to 22%.
          const glowX = ((event.clientX - rect.left) / rect.width) * 100;
          // Pointer x-position as a percentage across the element.
          const glowY = ((event.clientY - rect.top) / rect.height) * 100;
          // Pointer y-position as a percentage down the element.

          // CSS reads these variables to move the button and the radial glow.
          element.style.setProperty('--magnetic-x', `${clamp(x, -8, 8).toFixed(2)}px`);
          // Limit horizontal movement to -8px through 8px.
          element.style.setProperty('--magnetic-y', `${clamp(y, -6, 6).toFixed(2)}px`);
          // Limit vertical movement to -6px through 6px.
          element.style.setProperty('--glow-x', `${clamp(glowX, 8, 92).toFixed(2)}%`);
          // Keep the glow center away from extreme edges.
          element.style.setProperty('--glow-y', `${clamp(glowY, 8, 92).toFixed(2)}%`);
          frame = 0;
        });
      };

      // Reset hover variables when the cursor leaves the element.
      const reset = () => {
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }

        element.style.setProperty('--magnetic-x', '0px');
        element.style.setProperty('--magnetic-y', '0px');
        element.style.setProperty('--glow-x', '50%');
        element.style.setProperty('--glow-y', '50%');
      };

      element.addEventListener('pointerenter', update, { passive: true });
      // pointerenter fires when the pointer first enters the element.
      element.addEventListener('pointermove', update, { passive: true });
      // pointermove keeps the magnetic position following the cursor.
      element.addEventListener('pointerleave', reset, { passive: true });
      // pointerleave resets the effect when the cursor exits.
      element.addEventListener('blur', reset);
      // blur resets keyboard focus state if focus leaves the element.
    });
  };

  // ======================================================
  // PARALLAX SCROLL EFFECT
  // ======================================================
  //
  // PURPOSE:
  // Parallax gently moves media at a slightly different speed from the page.
  //
  // VISUAL RESULT:
  // Images and videos feel as if they have depth, like they are floating in a
  // shallow 3D layer behind the text.
  //
  // PERFORMANCE:
  // The system updates only near-visible elements and uses requestAnimationFrame
  // so scrolling remains smooth.
  const initParallax = () => {
    // Parallax gently moves images as the user scrolls.
    if (prefersReducedMotion()) {
      return;
    }

    const elements = uniqueElements('figure img, .img-rounded, .responsive-media iframe, .responsive-media video');

    if (!elements.length) {
      return;
    }

    let ticking = false;

    const update = () => {
      // Only move media that is near the visible part of the page.
      const viewportHeight = window.innerHeight || doc.documentElement.clientHeight;
      // Current height of the visible browser window.
      const strength = window.innerWidth < 760 ? 6 : 14;
      // Smaller screens get weaker movement so the effect stays comfortable.

      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        // Measures where the media element is relative to the viewport.

        if (rect.bottom < -120 || rect.top > viewportHeight + 120) {
          return;
          // Skip elements far outside the viewport to save work.
        }

        const midpoint = rect.top + rect.height / 2;
        // Vertical center of the element.
        const progress = (midpoint - viewportHeight / 2) / viewportHeight;
        // How far the element center is from the viewport center.
        const y = clamp(progress * -strength, -strength, strength);
        // Convert progress into a small pixel offset and keep it controlled.
        element.style.setProperty('--parallax-y', `${y.toFixed(2)}px`);
        // CSS reads this variable in transform: translate3d(...).
      });

      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
  };

  // ======================================================
  // LEAF ANIMATION INITIALIZATION
  // ======================================================
  //
  // PURPOSE:
  // This system creates decorative animated leaves in the background.
  //
  // WHY JAVASCRIPT CREATES THEM:
  // Instead of copying many leaf elements into every HTML file, JavaScript can
  // generate them once on each page. The page-specific variant changes the
  // number, size, and styling through CSS classes.
  //
  // ACCESSIBILITY:
  // The leaves are marked `aria-hidden="true"` because they are decoration.
  // Screen readers should focus on the actual content, not background shapes.
  const getPageMotionVariant = () => {
    // Pick a leaf style based on the current page path.
    const path = window.location.pathname.toLowerCase();
    // Current URL path, lowercased so comparisons are case-insensitive.

    if (path.includes('/pap/') || path.endsWith('/pap.html')) {
      return 'pap';
    }

    if (path.includes('/about') || path.endsWith('/about_me.html')) {
      return 'about';
    }

    return 'home';
  };

  const initLeafAnimations = () => {
    const variant = getPageMotionVariant();
    // Variant chooses whether leaves should feel like home, PAP, or About page.

    // If leaves already exist, do not create duplicates.
    if (doc.querySelector('.leaf-cluster')) {
      return;
    }

    doc.body.classList.add('has-motion-leaves', `motion-page-${variant}`);

    // Create a layer of random soft leaves across the background.
    const ambientLayer = doc.createElement('div');
    // Creates a new <div> that will hold many soft background leaves.
    const ambientCount = variant === 'home' ? 24 : 8;
    // Home gets more leaves because it is the main visual landing page.
    const minSize = variant === 'home' ? 72 : 96;
    // Minimum generated leaf size in pixels.
    const sizeRange = variant === 'home' ? 144 : 128;
    // Random extra size range added to minSize.
    const clusterLeafCount = variant === 'home' ? 6 : 4;
    // Number of larger leaves in each side cluster.

    ambientLayer.className = `ambient-leaves ambient-leaves--${variant}`;
    ambientLayer.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < ambientCount; index += 1) {
      // Each leaf gets random size, position, rotation, and timing.
      const leaf = doc.createElement('span');
      // A span is enough because CSS will make it look like a leaf.
      const x = 4 + Math.random() * 88;
      // Random horizontal position between 4vw and 92vw.
      const y = 8 + Math.random() * 78;
      // Random vertical position between 8vh and 86vh.
      const size = minSize + Math.random() * sizeRange;
      // Random leaf size.
      const rotate = -34 + Math.random() * 68;
      // Random rotation between -34deg and 34deg.
      const duration = 16 + Math.random() * 14;
      // Random animation length between 16s and 30s.
      const delay = Math.random() * -12;
      // Negative delay makes leaves begin at different points in their animation.

      leaf.className = 'ambient-leaf';
      leaf.style.setProperty('--leaf-x', `${x.toFixed(2)}vw`);
      leaf.style.setProperty('--leaf-y', `${y.toFixed(2)}vh`);
      leaf.style.setProperty('--leaf-size', `${size.toFixed(2)}px`);
      leaf.style.setProperty('--leaf-rotate', `${rotate.toFixed(2)}deg`);
      leaf.style.setProperty('--leaf-duration', `${duration.toFixed(2)}s`);
      leaf.style.setProperty('--leaf-delay', `${delay.toFixed(2)}s`);
      ambientLayer.appendChild(leaf);
    }

    doc.body.prepend(ambientLayer);
    // Put the leaf layer at the beginning of body so it sits behind content.

    // Create bigger leaf clusters on the left and right edges.
    ['left', 'right'].forEach((side) => {
      const cluster = doc.createElement('div');
      cluster.className = `leaf-cluster leaf-cluster--${side} leaf-cluster--${variant}`;
      cluster.setAttribute('aria-hidden', 'true');

      for (let index = 0; index < clusterLeafCount; index += 1) {
        const leaf = doc.createElement('span');
        leaf.className = 'leaf-cluster__leaf';
        cluster.appendChild(leaf);
        // CSS nth-child rules position and animate each cluster leaf differently.
      }

      doc.body.prepend(cluster);
    });
  };

  const syncReducedMotionClass = () => {
    // Keep a class on <html> so CSS can reduce motion when needed.
    root.classList.toggle('motion-reduced', prefersReducedMotion());
  };

  const initializeAnimations = () => {
    // ======================================================
    // MASTER INITIALIZATION ORDER
    // ======================================================
    //
    // The order matters:
    // 1. Sync reduced-motion state first so every system knows accessibility.
    // 2. Create leaves before reveal setup so decorative elements exist early.
    // 3. Prepare reveal classes and observers.
    // 4. Prepare click scrolling and floating navigation.
    // 5. Prepare hover and parallax enhancements last.
    // Start all animation systems after the page is ready.
    syncReducedMotionClass();
    initLeafAnimations();
    initScrollReveal();
    initSmoothScroll();
    initFloatingNavigation();
    initMagneticHover();
    initParallax();
  };

  reduceMotionQuery.addEventListener('change', syncReducedMotionClass);
  // If the user changes reduced-motion settings while the page is open, update
  // the class immediately instead of requiring a refresh.

  onReady(initializeAnimations);
  // Wait until the HTML is ready, then start the whole animation system.
})();
