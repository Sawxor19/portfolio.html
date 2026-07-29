(() => {
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isProjectDetailPage = document.body?.classList.contains("project-detail-page");

  // Prevent browser from restoring previous scroll position
  if (!isProjectDetailPage && "scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const initialHash = window.location.hash;
  const navigationEntry = performance.getEntriesByType?.("navigation")?.[0];
  const cameFromProjectDetail = /\/(?:projetos\/[^/]+\.html|e-clinic\/?|mosquiteira\.com-sistema\/?|or(?:ç|%c3%a7)amentos\/?|renunciasfiscais\/?|reformaagraria\/?)$/i.test(
    new URL(document.referrer || window.location.href).pathname
  );
  const shouldStartAtTop = !initialHash && (navigationEntry?.type === "reload" || !cameFromProjectDetail);

  if (!isProjectDetailPage && shouldStartAtTop) {
    window.scrollTo(0, 0);
  }

  function normalizeText(value) {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function createDialogController(container, options = {}) {
    const { initialFocus, onOpen, onClose } = options;
    let lastTrigger = null;
    let inertSiblings = [];

    function getFocusableElements() {
      return Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    }

    function open(trigger) {
      lastTrigger = trigger;
      container.hidden = false;
      document.body.classList.add("lightbox-open");

      inertSiblings = Array.from(document.body.children).filter((element) => element !== container && !element.inert);
      inertSiblings.forEach((element) => { element.inert = true; });

      onOpen?.();
      (initialFocus?.() || getFocusableElements()[0])?.focus();
    }

    function close() {
      if (container.hidden) return;

      container.hidden = true;
      document.body.classList.remove("lightbox-open");
      inertSiblings.forEach((element) => { element.inert = false; });
      inertSiblings = [];
      onClose?.();
      lastTrigger?.focus();
    }

    container.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    });

    return { open, close };
  }

  function initProjectNavbar() {
    if (!isProjectDetailPage || document.querySelector(".bottom-nav")) return;

    const nav = document.createElement("nav");
    nav.className = "bottom-nav project-navbar";
    nav.setAttribute("aria-label", "Navegação principal");
    nav.innerHTML = `
      <div class="nav-inner">
        <a class="nav-brand" href="/index.html#inicio" aria-label="www.hictorvugo.com.br — início">
          <img class="nav-logo" src="/assets/brand/vhs-logo-mark.png" alt="" aria-hidden="true" width="512" height="512" decoding="async">
          <span>www.hictorvugo.com.br</span>
        </a>
        <div class="nav-separator"></div>
        <div class="nav-links">
          <a href="/index.html#inicio">Início</a>
          <a href="/index.html#sobre">Sobre</a>
          <a href="/index.html#formacao">Formação</a>
          <a class="active" href="/index.html#projetos" aria-current="page">Projetos</a>
          <a href="/index.html#skills">Skills</a>
          <a href="/index.html#contato">Contato</a>
        </div>
        <div class="nav-separator"></div>
        <a class="nav-cta" href="/index-en.html#projects">EN</a>
        <a class="nav-cta nav-cta-primary" href="/index.html#contato">FALE COMIGO</a>
      </div>
    `;

    document.body.prepend(nav);
  }

  function initSectionNavigation() {
    const navLinks = Array.from(document.querySelectorAll(".bottom-nav .nav-links a[data-section]"));
    const sections = navLinks
      .map((link) => document.getElementById(link.dataset.section))
      .filter(Boolean);

    if (navLinks.length) {
      navLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
          const target = document.getElementById(link.dataset.section);
          if (!target) {
            return;
          }

          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    function updateActiveLink() {
      if (!navLinks.length || !sections.length) return;

      const scrollY = window.scrollY + 140;
      let current = sections[0]?.id || "";

      for (const section of sections) {
        if (section.offsetTop <= scrollY) {
          current = section.id;
        }
      }

      navLinks.forEach((link) => {
        link.classList.toggle("active", link.dataset.section === current);
      });
    }

    window.addEventListener("scroll", updateActiveLink, { passive: true });
    updateActiveLink();
  }

  function initRevealAnimations() {
    const reduceMotion = prefersReducedMotion();
    const revealSelectors = [
      ".hero",
      ".hero-content > *",
      ".hero-image",
      ".section-title",
      ".about-text",
      ".timeline-content",
      ".highlight-card",
      ".academic-matrix-head",
      ".academic-card",
      ".project-showcase-head",
      ".skill-category",
      ".contact-intro",
      ".contact-card",
      ".project-detail-topbar",
      ".project-detail-hero > *",
      ".project-detail-main > .detail-card",
      ".project-detail-aside > .detail-card",
      ".detail-card-architecture",
      ".detail-related",
    ];
    const elements = Array.from(new Set(document.querySelectorAll(revealSelectors.join(","))));

    elements.forEach((element, index) => {
      element.classList.add("reveal-item");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    document.querySelector(".hero")?.classList.add("is-visible");
  }

  function initProjectGallery() {
    const gallery = document.querySelector("[data-project-gallery]");
    if (!gallery) return;

    const grid = gallery.querySelector("[data-project-grid]");
    const cards = Array.from(gallery.querySelectorAll("[data-project-card]"));
    const conveyor = gallery.querySelector("[data-project-conveyor]");

    if (!grid || !cards.length || !conveyor) {
      return;
    }

    cards.sort((firstCard, secondCard) => {
      const firstPriority = Number(firstCard.dataset.projectPriority || 0);
      const secondPriority = Number(secondCard.dataset.projectPriority || 0);
      return secondPriority - firstPriority;
    });
    const primaryGroup = document.createElement("div");
    primaryGroup.className = "project-conveyor-group";
    primaryGroup.setAttribute("data-conveyor-group", "primary");
    cards.forEach((card) => primaryGroup.appendChild(card));

    grid.replaceChildren(primaryGroup);

    if (prefersReducedMotion()) {
      grid.classList.add("is-conveyor-static");
      conveyor.classList.add("is-conveyor-static");
      return;
    }

    const duplicateGroup = primaryGroup.cloneNode(true);
    duplicateGroup.setAttribute("data-conveyor-group", "duplicate");
    duplicateGroup.setAttribute("aria-hidden", "true");
    duplicateGroup.querySelectorAll("[data-project-card]").forEach((card) => {
      card.removeAttribute("data-project-card");
      card.removeAttribute("data-project-priority");
      card.classList.remove("reveal-item", "is-visible");
      card.style.removeProperty("--reveal-delay");
    });
    duplicateGroup.querySelectorAll("a, button, input, select, textarea").forEach((element) => {
      element.setAttribute("tabindex", "-1");
    });
    grid.appendChild(duplicateGroup);
    grid.classList.add("is-conveyor-running");

    let touchPauseTimer = null;

    function updateConveyorSpeed() {
      const pixelsPerSecond = window.innerWidth <= 760 ? 48 : 68;
      const duration = Math.max(20, primaryGroup.scrollWidth / pixelsPerSecond);
      grid.style.setProperty("--project-conveyor-duration", `${duration.toFixed(2)}s`);
    }

    function pauseForTouch() {
      conveyor.classList.add("is-conveyor-paused");
      window.clearTimeout(touchPauseTimer);
      touchPauseTimer = window.setTimeout(() => {
        conveyor.classList.remove("is-conveyor-paused");
      }, 4200);
    }

    conveyor.addEventListener("pointerdown", pauseForTouch, { passive: true });
    window.addEventListener("resize", updateConveyorSpeed);
    document.addEventListener("visibilitychange", () => {
      conveyor.classList.toggle("is-page-hidden", document.hidden);
    });

    if ("IntersectionObserver" in window) {
      const conveyorObserver = new IntersectionObserver(
        ([entry]) => {
          conveyor.classList.toggle("is-conveyor-offscreen", !entry.isIntersecting);
        },
        { threshold: 0.08 }
      );
      conveyorObserver.observe(conveyor);
    }

    window.requestAnimationFrame(updateConveyorSpeed);
  }

  function initProjectShotCarousel() {
    const carousels = Array.from(document.querySelectorAll("[data-project-shot-carousel]"));
    if (!carousels.length) return;

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");

    carousels.forEach((carousel, carouselIndex) => {
      const track = carousel.querySelector("[data-project-shot-track]");
      const slides = Array.from(carousel.querySelectorAll(".project-shot-card"));
      const prevButtons = Array.from(carousel.parentElement?.querySelectorAll('[data-shot-control="prev"]') || []);
      const nextButtons = Array.from(carousel.parentElement?.querySelectorAll('[data-shot-control="next"]') || []);
      const currentLabel = carousel.parentElement?.querySelector("[data-shot-current]");
      const totalLabel = carousel.parentElement?.querySelector("[data-shot-total]");
      const pagination = carousel.querySelector("[data-shot-pagination]");

      if (!track || !slides.length || !pagination) {
        return;
      }

      let currentIndex = 0;
      let scrollTimer = null;
      const trackId = track.id || `project-shot-track-${carouselIndex + 1}`;

      track.id = trackId;
      track.setAttribute("role", "region");
      track.setAttribute("aria-roledescription", isEnglish ? "carousel" : "carrossel");
      track.setAttribute("aria-label", isEnglish ? "Project screenshots" : "Telas do projeto");

      [...prevButtons, ...nextButtons].forEach((button) => {
        button.setAttribute("aria-controls", trackId);
      });

      slides.forEach((slide, index) => {
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", isEnglish ? "slide" : "tela");
        slide.setAttribute(
          "aria-label",
          isEnglish
            ? `${index + 1} of ${slides.length}`
            : `${index + 1} de ${slides.length}`
        );
      });

      if (totalLabel) {
        totalLabel.textContent = String(slides.length).padStart(2, "0");
      }

      if (currentLabel) {
        currentLabel.setAttribute("aria-live", "polite");
        currentLabel.setAttribute("aria-atomic", "true");
      }

      function updateUI() {
        if (currentLabel) {
          currentLabel.textContent = String(currentIndex + 1).padStart(2, "0");
        }

        prevButtons.forEach((button) => {
          button.disabled = currentIndex === 0;
        });

        nextButtons.forEach((button) => {
          button.disabled = currentIndex === slides.length - 1;
        });

        Array.from(pagination.children).forEach((dot, index) => {
          dot.classList.toggle("is-active", index === currentIndex);
          dot.setAttribute("aria-current", index === currentIndex ? "true" : "false");
        });
      }

      function scrollToSlide(index) {
        currentIndex = Math.max(0, Math.min(index, slides.length - 1));
        track.scrollTo({
          left: slides[currentIndex].offsetLeft,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
        updateUI();
      }

      function syncFromScroll() {
        const closestIndex = slides.reduce((bestIndex, slide, index) => {
          const bestDistance = Math.abs(slides[bestIndex].offsetLeft - track.scrollLeft);
          const currentDistance = Math.abs(slide.offsetLeft - track.scrollLeft);
          return currentDistance < bestDistance ? index : bestIndex;
        }, 0);

        currentIndex = closestIndex;
        updateUI();
      }

      slides.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "project-shot-dot";
        dot.setAttribute("aria-controls", trackId);
        dot.setAttribute(
          "aria-label",
          isEnglish ? `Go to screenshot ${index + 1}` : `Ir para a tela ${index + 1}`
        );
        dot.addEventListener("click", () => {
          scrollToSlide(index);
        });
        pagination.appendChild(dot);
      });

      prevButtons.forEach((button) => {
        button.addEventListener("click", () => {
          scrollToSlide(currentIndex - 1);
        });
      });

      nextButtons.forEach((button) => {
        button.addEventListener("click", () => {
          scrollToSlide(currentIndex + 1);
        });
      });

      track.addEventListener(
        "scroll",
        () => {
          window.clearTimeout(scrollTimer);
          scrollTimer = window.setTimeout(syncFromScroll, 80);
        },
        { passive: true }
      );

      track.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          scrollToSlide(currentIndex - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          scrollToSlide(currentIndex + 1);
        }
      });

      window.addEventListener("resize", () => {
        track.scrollTo({
          left: slides[currentIndex].offsetLeft,
          behavior: "auto",
        });
        updateUI();
      });

      updateUI();
    });
  }

  function initProjectImageLightbox() {
    const cards = Array.from(document.querySelectorAll(".project-shot-card"));
    const zoomableCards = cards.filter((card) => card.querySelector("img"));
    if (!zoomableCards.length) return;

    const lightbox = document.createElement("div");
    lightbox.className = "project-lightbox";
    lightbox.hidden = true;
    lightbox.innerHTML = `
      <button class="project-lightbox-backdrop" type="button" aria-label="Fechar visualizacao ampliada"></button>
      <div class="project-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Imagem ampliada do projeto">
        <div class="project-lightbox-header">
          <span class="project-lightbox-counter"></span>
          <div class="project-lightbox-controls">
            <button class="project-lightbox-nav project-lightbox-nav-prev" type="button" aria-label="Imagem anterior">&larr;</button>
            <button class="project-lightbox-nav project-lightbox-nav-next" type="button" aria-label="Proxima imagem">&rarr;</button>
            <button class="project-lightbox-close" type="button" aria-label="Fechar imagem">&times;</button>
          </div>
        </div>
        <figure class="project-lightbox-figure">
          <img class="project-lightbox-image" alt="">
          <figcaption class="project-lightbox-caption"></figcaption>
        </figure>
      </div>
    `;

    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector(".project-lightbox-image");
    const lightboxCaption = lightbox.querySelector(".project-lightbox-caption");
    const lightboxCounter = lightbox.querySelector(".project-lightbox-counter");
    const closeButton = lightbox.querySelector(".project-lightbox-close");
    const prevButton = lightbox.querySelector(".project-lightbox-nav-prev");
    const nextButton = lightbox.querySelector(".project-lightbox-nav-next");
    const backdropButton = lightbox.querySelector(".project-lightbox-backdrop");
    let activeIndex = -1;

    const dialog = createDialogController(lightbox, {
      initialFocus: () => closeButton,
    });

    function renderLightbox(index) {
      const card = zoomableCards[index];
      const image = card?.querySelector("img");
      const caption = card?.querySelector("figcaption");
      if (!image || !lightboxImage || !lightboxCaption) return;

      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt || "Imagem ampliada do projeto";
      lightboxCaption.textContent = caption?.textContent?.trim() || image.alt || "";

      if (lightboxCounter) {
        lightboxCounter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(zoomableCards.length).padStart(2, "0")}`;
      }

      if (prevButton) {
        prevButton.disabled = index <= 0;
      }

      if (nextButton) {
        nextButton.disabled = index >= zoomableCards.length - 1;
      }
    }

    function closeLightbox() {
      dialog.close();
    }

    function openLightbox(index, trigger) {
      if (!closeButton) return;

      activeIndex = index;
      renderLightbox(activeIndex);
      dialog.open(trigger);
    }

    function changeSlide(direction) {
      const nextIndex = activeIndex + direction;
      if (nextIndex < 0 || nextIndex >= zoomableCards.length) return;

      activeIndex = nextIndex;
      renderLightbox(activeIndex);
    }

    zoomableCards.forEach((card, index) => {
      const image = card.querySelector("img");
      if (!image) return;

      card.classList.add("is-zoomable");
      image.addEventListener("click", () => openLightbox(index, image));

      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-shot-expand";
      button.textContent = "Abrir 100%";
      button.setAttribute("aria-label", `Abrir ${image.alt || "imagem"} em tamanho completo`);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openLightbox(index, button);
      });

      const captionNode = card.querySelector("figcaption");
      card.insertBefore(button, captionNode || null);
    });

    closeButton?.addEventListener("click", closeLightbox);
    backdropButton?.addEventListener("click", closeLightbox);
    prevButton?.addEventListener("click", () => changeSlide(-1));
    nextButton?.addEventListener("click", () => changeSlide(1));

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    lightbox.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;

      if (event.key === "ArrowLeft") {
        changeSlide(-1);
      } else if (event.key === "ArrowRight") {
        changeSlide(1);
      }
    });
  }

  function initProjectDetailExperience() {
    if (!document.body.classList.contains("project-detail-page")) return;

    const topbar = document.querySelector(".project-detail-topbar");
    const progress = document.createElement("div");
    progress.className = "project-reading-progress";
    progress.setAttribute("aria-hidden", "true");
    progress.innerHTML = '<span class="project-reading-progress-bar"></span>';
    document.body.prepend(progress);

    const progressBar = progress.firstElementChild;
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateProjectScrollState() {
      const scrollY = Math.max(0, window.scrollY);
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const readingProgress = Math.min(1, scrollY / scrollRange);

      progressBar?.style.setProperty("--reading-progress", String(readingProgress));

      if (topbar) {
        const delta = scrollY - lastScrollY;
        const hasFocus = topbar.contains(document.activeElement);
        const shouldHide = scrollY > 140 && delta > 6 && !hasFocus;
        const shouldShow = delta < -6 || scrollY <= 140 || hasFocus;

        if (shouldHide) topbar.classList.add("is-hidden");
        if (shouldShow) topbar.classList.remove("is-hidden");
      }

      lastScrollY = scrollY;
      ticking = false;
    }

    function requestProjectScrollUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateProjectScrollState);
    }

    topbar?.addEventListener("focusin", () => topbar.classList.remove("is-hidden"));
    topbar?.addEventListener("mouseenter", () => topbar.classList.remove("is-hidden"));
    window.addEventListener("scroll", requestProjectScrollUpdate, { passive: true });
    window.addEventListener("resize", requestProjectScrollUpdate);
    window.addEventListener("load", requestProjectScrollUpdate, { once: true });
    updateProjectScrollState();
  }

  function initProjectSectionScrolling() {
    if (!document.body.classList.contains("project-detail-page")) return;

    const content = document.querySelector(".project-detail-content");
    const layout = content?.querySelector(".project-detail-layout");
    const mainCards = Array.from(layout?.querySelectorAll(".project-detail-main > .detail-card") || []);
    const getRoleCard = (role) => layout?.querySelector(`[data-project-role="${role}"]`)?.closest(".detail-card");
    const overviewCard = getRoleCard("overview");
    const stackCard = getRoleCard("stack");
    const valueCard = getRoleCard("value");
    const deliveryCard = getRoleCard("delivery");
    const galleryCard = getRoleCard("gallery");

    if (content && layout && overviewCard && stackCard && valueCard && deliveryCard) {
      const flow = document.createElement("div");
      flow.className = "project-section-flow";

      const createSectionBox = (...cards) => {
        const box = document.createElement("section");
        box.className = `project-section-box${cards.length > 1 ? " project-section-box-pair" : ""}`;
        const isGallerySection = cards.some((card) => card.querySelector('[data-project-role="gallery"]'));
        if (isGallerySection) box.classList.add("project-section-box-gallery");
        box.dataset.projectScrollSection = "";
        cards.forEach((card) => box.appendChild(card));
        const sectionNames = cards
          .map((card) => card.querySelector(".detail-card-title")?.textContent?.trim())
          .filter(Boolean);
        if (sectionNames.length) box.setAttribute("aria-label", sectionNames.join(" e "));
        return box;
      };

      flow.append(createSectionBox(overviewCard, stackCard));
      flow.append(createSectionBox(valueCard, deliveryCard));

      if (galleryCard) {
        flow.append(createSectionBox(galleryCard));
      }

      const remainingCards = mainCards.filter(
        (card) => card !== overviewCard && card !== deliveryCard && card !== galleryCard
      );
      remainingCards.forEach((card) => flow.append(createSectionBox(card)));

      layout.replaceWith(flow);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopLayout = window.matchMedia("(min-width: 901px) and (min-height: 620px)");
    const explicitSections = Array.from(document.querySelectorAll("[data-project-scroll-section]"));
    const sectionBoxes = [
      document.querySelector(".project-detail-hero"),
      ...(explicitSections.length ? explicitSections : [document.querySelector(".project-detail-layout")]),
      document.querySelector(".detail-card-architecture"),
      document.querySelector(".detail-related"),
    ].filter(Boolean);

    const snapTargets = sectionBoxes.map((box) => {
      const stage = document.createElement("div");
      stage.className = "project-scroll-stage project-scroll-step";
      box.before(stage);
      stage.appendChild(box);
      box.classList.add("project-scroll-box");
      return stage;
    });

    if (!snapTargets.length) return;

    let ticking = false;

    function setActiveProjectStep() {
      if (!document.documentElement.classList.contains("project-section-scrolling")) {
        snapTargets.forEach((target) => target.classList.add("is-project-step-active"));
        ticking = false;
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      let activeTarget = snapTargets[0];
      let activeDistance = Number.POSITIVE_INFINITY;

      snapTargets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);

        if (distance < activeDistance) {
          activeDistance = distance;
          activeTarget = target;
        }
      });

      snapTargets.forEach((target) => {
        target.classList.toggle("is-project-step-active", target === activeTarget);
      });

      ticking = false;
    }

    function requestActiveProjectStep() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(setActiveProjectStep);
    }

    function syncProjectScrolling() {
      const enabled = desktopLayout.matches && !reduceMotion.matches;
      document.documentElement.classList.toggle("project-section-scrolling", enabled);
      setActiveProjectStep();
    }

    desktopLayout.addEventListener?.("change", syncProjectScrolling);
    reduceMotion.addEventListener?.("change", syncProjectScrolling);
    window.addEventListener("scroll", requestActiveProjectStep, { passive: true });
    window.addEventListener("resize", requestActiveProjectStep);
    syncProjectScrolling();
  }

  function initCvModal() {
    const modal = document.querySelector("[data-cv-modal]");
    const openButtons = Array.from(document.querySelectorAll("[data-cv-open]"));
    if (!modal || !openButtons.length) return;

    const closeButtons = Array.from(modal.querySelectorAll("[data-cv-close]"));
    const closeButton = modal.querySelector(".cv-modal-close");
    const dialog = createDialogController(modal, {
      initialFocus: () => closeButton,
    });

    openButtons.forEach((button) => {
      button.addEventListener("click", () => dialog.open(button));
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", dialog.close);
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        dialog.close();
      }
    });
  }

  initProjectNavbar();
  initSectionNavigation();
  initRevealAnimations();
  initProjectGallery();
  initProjectShotCarousel();
  initProjectImageLightbox();
  initProjectDetailExperience();
  initProjectSectionScrolling();
  initCvModal();

  if (initialHash) {
    const initialTarget = document.getElementById(initialHash.slice(1));
    if (initialTarget) {
      window.requestAnimationFrame(() => {
        initialTarget.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }
  }
})();
