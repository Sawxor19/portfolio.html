(() => {
  // Prevent browser from restoring previous scroll position
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const initialHash = window.location.hash;
  const navigationEntry = performance.getEntriesByType?.("navigation")?.[0];
  const cameFromProjectDetail = document.referrer.includes("/projetos/");
  const shouldStartAtTop = !initialHash || navigationEntry?.type === "reload" || !cameFromProjectDetail;

  if (shouldStartAtTop) {
    if (initialHash && "replaceState" in history) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
  }

  function normalizeText(value) {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
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

      const scrollY = window.scrollY + 120;
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
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".section, .hero").forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "translateY(0)";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".section, .hero").forEach((element) => {
      element.style.opacity = "0";
      element.style.transform = "translateY(20px)";
      element.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      observer.observe(element);
    });

    const hero = document.querySelector(".hero");
    if (hero) {
      hero.style.opacity = "1";
      hero.style.transform = "translateY(0)";
    }
  }

  function initLegacyProjectCarousel() {
    const carousel = document.querySelector("[data-project-carousel]");
    if (!carousel) return;

    const track = carousel.querySelector(".project-grid");
    const cards = Array.from(carousel.querySelectorAll(".project-card"));
    const prevButton = document.querySelector('[data-carousel-control="prev"]');
    const nextButton = document.querySelector('[data-carousel-control="next"]');
    const currentLabel = carousel.querySelector("[data-carousel-current]");
    const totalLabel = carousel.querySelector("[data-carousel-total]");

    if (!track || !cards.length || !prevButton || !nextButton || !currentLabel || !totalLabel) {
      return;
    }

    totalLabel.textContent = String(cards.length).padStart(2, "0");

    let currentIndex = 0;
    let scrollTimer = null;

    function updateCarouselUI() {
      currentLabel.textContent = String(currentIndex + 1).padStart(2, "0");
      prevButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === cards.length - 1;

      cards.forEach((card, index) => {
        card.classList.toggle("is-active", index === currentIndex);
      });
    }

    function scrollToCard(index) {
      currentIndex = Math.max(0, Math.min(index, cards.length - 1));
      track.scrollTo({
        left: cards[currentIndex].offsetLeft,
        behavior: "smooth",
      });
      updateCarouselUI();
    }

    function syncCarouselFromScroll() {
      const closestIndex = cards.reduce((bestIndex, card, index) => {
        const bestDistance = Math.abs(cards[bestIndex].offsetLeft - track.scrollLeft);
        const currentDistance = Math.abs(card.offsetLeft - track.scrollLeft);
        return currentDistance < bestDistance ? index : bestIndex;
      }, 0);

      currentIndex = closestIndex;
      updateCarouselUI();
    }

    prevButton.addEventListener("click", () => scrollToCard(currentIndex - 1));
    nextButton.addEventListener("click", () => scrollToCard(currentIndex + 1));

    track.addEventListener(
      "scroll",
      () => {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(syncCarouselFromScroll, 80);
      },
      { passive: true }
    );

    track.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToCard(currentIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToCard(currentIndex + 1);
      }
    });

    window.addEventListener("resize", () => scrollToCard(currentIndex));
    updateCarouselUI();
  }

  function initProjectGallery() {
    const gallery = document.querySelector("[data-project-gallery]");
    if (!gallery) return;

    const grid = gallery.querySelector("[data-project-grid]");
    const cards = Array.from(gallery.querySelectorAll("[data-project-card]"));
    const searchInput = gallery.querySelector("[data-project-search]");
    const prevButton = gallery.querySelector('[data-gallery-control="prev"]');
    const nextButton = gallery.querySelector('[data-gallery-control="next"]');
    const countLabel = gallery.querySelector("[data-project-count]");
    const pagination = gallery.querySelector("[data-project-pagination]");

    if (!grid || !cards.length || !searchInput || !prevButton || !nextButton || !countLabel || !pagination) {
      return;
    }

    let currentIndex = 0;
    let filteredCards = cards.slice();

    function scrollGridToCard(card, behavior = "smooth") {
      if (!card) return;

      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const nextLeft = grid.scrollLeft + cardRect.left - gridRect.left;

      grid.scrollTo({
        left: nextLeft,
        behavior,
      });
    }

    function getVisibleCount() {
      if (window.innerWidth <= 760) return 1;
      if (window.innerWidth <= 1040) return 2;
      return 3;
    }

    function renderDots() {
      const visibleCount = getVisibleCount();
      const totalSteps = filteredCards.length > 0 ? Math.max(1, filteredCards.length - visibleCount + 1) : 0;
      pagination.innerHTML = "";

      for (let i = 0; i < totalSteps; i += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "project-gallery-dot";
        dot.setAttribute("aria-label", `Ir para item ${i + 1}`);
        dot.classList.toggle("is-active", i === currentIndex);
        dot.addEventListener("click", () => {
          currentIndex = i;
          updateCarousel({ shouldScroll: true });
        });
        pagination.appendChild(dot);
      }
    }

    function updateCarousel(options = {}) {
      const { shouldScroll = false, behavior = "smooth" } = options;
      const query = normalizeText(searchInput.value);

      filteredCards = cards.filter((card) => {
        const searchableText = normalizeText(card.dataset.search);
        return !query || searchableText.includes(query);
      });

      cards.forEach((card) => { card.style.display = "none"; });
      filteredCards.forEach((card) => { card.style.display = ""; });

      const visibleCount = getVisibleCount();
      const maxIndex = Math.max(0, filteredCards.length - visibleCount);
      currentIndex = Math.min(currentIndex, maxIndex);

      if (shouldScroll && filteredCards.length > 0 && filteredCards[currentIndex]) {
        scrollGridToCard(filteredCards[currentIndex], behavior);
      }

      prevButton.disabled = currentIndex === 0 || filteredCards.length === 0;
      nextButton.disabled = currentIndex >= maxIndex || filteredCards.length === 0;

      if (filteredCards.length === 0) {
        countLabel.textContent = "Nenhum projeto encontrado";
      } else {
        const endIdx = Math.min(currentIndex + visibleCount, filteredCards.length);
        countLabel.textContent = `Mostrando ${currentIndex + 1}-${endIdx} de ${filteredCards.length} projetos`;
      }

      renderDots();
    }

    searchInput.addEventListener("input", () => {
      currentIndex = 0;
      updateCarousel({ shouldScroll: true });
    });

    prevButton.addEventListener("click", () => {
      if (currentIndex === 0) return;
      currentIndex -= 1;
      updateCarousel({ shouldScroll: true });
    });

    nextButton.addEventListener("click", () => {
      const visibleCount = getVisibleCount();
      const maxIndex = Math.max(0, filteredCards.length - visibleCount);
      if (currentIndex >= maxIndex) return;
      currentIndex += 1;
      updateCarousel({ shouldScroll: true });
    });

    window.addEventListener("resize", () => updateCarousel({ shouldScroll: true, behavior: "auto" }));
    updateCarousel();
  }

  function initProjectShotCarousel() {
    const carousels = Array.from(document.querySelectorAll("[data-project-shot-carousel]"));
    if (!carousels.length) return;

    carousels.forEach((carousel) => {
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

      if (totalLabel) {
        totalLabel.textContent = String(slides.length).padStart(2, "0");
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
        });
      }

      function scrollToSlide(index) {
        currentIndex = Math.max(0, Math.min(index, slides.length - 1));
        track.scrollTo({
          left: slides[currentIndex].offsetLeft,
          behavior: "smooth",
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
        dot.setAttribute("aria-label", `Ir para a tela ${index + 1} do sistema`);
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
    let lastTrigger = null;
    let activeIndex = -1;

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
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");

      if (lastTrigger) {
        lastTrigger.focus();
      }
    }

    function openLightbox(index, trigger) {
      if (!closeButton) return;

      activeIndex = index;
      lastTrigger = trigger;
      renderLightbox(activeIndex);
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      closeButton.focus();
    }

    function changeSlide(direction) {
      const nextIndex = activeIndex + direction;
      if (nextIndex < 0 || nextIndex >= zoomableCards.length) return;

      activeIndex = nextIndex;
      renderLightbox(activeIndex);
    }

    zoomableCards.forEach((card, index) => {
      const image = card.querySelector("img");
      const caption = card.querySelector("figcaption");
      if (!image) return;

      card.classList.add("is-zoomable");
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute(
        "aria-label",
        `Abrir imagem em tamanho completo: ${image.alt || caption?.textContent?.trim() || "captura do projeto"}`
      );

      image.addEventListener("click", () => openLightbox(index, image));
      image.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(index, image);
        }
      });

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

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;

      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        changeSlide(-1);
      } else if (event.key === "ArrowRight") {
        changeSlide(1);
      }
    });
  }

  function initCvModal() {
    const modal = document.querySelector("[data-cv-modal]");
    const openButtons = Array.from(document.querySelectorAll("[data-cv-open]"));
    if (!modal || !openButtons.length) return;

    const closeButtons = Array.from(modal.querySelectorAll("[data-cv-close]"));
    const closeButton = modal.querySelector(".cv-modal-close");
    let lastTrigger = null;

    function openModal(trigger) {
      lastTrigger = trigger;
      modal.hidden = false;
      document.body.classList.add("lightbox-open");
      closeButton?.focus();
    }

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove("lightbox-open");
      lastTrigger?.focus();
    }

    openButtons.forEach((button) => {
      button.addEventListener("click", () => openModal(button));
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (modal.hidden || event.key !== "Escape") return;
      closeModal();
    });
  }

  initSectionNavigation();
  initRevealAnimations();
  initLegacyProjectCarousel();
  initProjectGallery();
  initProjectShotCarousel();
  initProjectImageLightbox();
  initCvModal();
})();
