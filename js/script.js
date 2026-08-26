/* =========================
YD WEBSITE JAVASCRIPT
========================= */



/* =========================
PRODUCT DATA SOURCE
LOCAL JSON ONLY
========================= */

const PRODUCT_DATA_URL = "data/product-card.json";
const PRODUCT_PAGE_SIZE = 20;

let activeProductCategory = "all";
let activeProductPage = 1;

async function fetchProductData() {
    if (window.location.protocol === "file:") {
        throw new Error(
            "Local JSON cannot be loaded reliably from file://. Run the site with VS Code Live Server or another local HTTP server."
        );
    }

    const response = await fetch(PRODUCT_DATA_URL, {
        cache: "no-store",
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`Product data returned HTTP ${response.status}`);
    }

    const products = await response.json();

    if (!Array.isArray(products)) {
        throw new Error("product-card.json must contain a top-level JSON array");
    }

    return products;
}


/* =========================
PRODUCT CARD BUILDER
========================= */

function getProductDisplayTitle(product) {
    return String(
        product.title || product.product_name || product.YD_sku || "Product"
    ).trim();
}

function appendTextWithLineBreaks(element, value) {
    const parts = String(value || "").split(/<br\s*\/?\s*>/gi);

    parts.forEach((part, index) => {
        if (index > 0) {
            element.appendChild(document.createElement("br"));
        }
        element.appendChild(document.createTextNode(part));
    });
}

function createProductCard(product) {
    const category = String(product.category || "").trim();
    const normalizedCategory = category.toLowerCase();
    const title = getProductDisplayTitle(product);
    const plainTitle = title
        .replace(/<br\s*\/?\s*>/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.category = normalizedCategory;

    if (product.YD_sku) {
        card.dataset.sku = String(product.YD_sku).trim();
    }

    const imageSwap = document.createElement("div");
    imageSwap.className = "product-image-swap";

    const primaryImage = document.createElement("img");
    primaryImage.className = "product-image-primary";
    primaryImage.alt = plainTitle;
    primaryImage.loading = "lazy";
    primaryImage.decoding = "async";

    if (product.img_1) {
        primaryImage.src = String(product.img_1).trim();
    }

    imageSwap.appendChild(primaryImage);

    if (product.img_2) {
        const secondaryImage = document.createElement("img");
        secondaryImage.className = "product-image-secondary";
        secondaryImage.dataset.src = String(product.img_2).trim();
        secondaryImage.alt = `${plainTitle} alternate view`;
        secondaryImage.loading = "lazy";
        secondaryImage.decoding = "async";
        imageSwap.appendChild(secondaryImage);
    }

    const content = document.createElement("div");
    content.className = "product-content";

    const tag = document.createElement("span");
    tag.className = "product-tag";
    tag.textContent = category.toUpperCase();

    const heading = document.createElement("h3");
    appendTextWithLineBreaks(heading, title);

    content.appendChild(tag);
    content.appendChild(heading);

    if (product.feature) {
        const features = document.createElement("p");
        features.className = "product-features";
        features.textContent = String(product.feature).trim();
        content.appendChild(features);
    }

    card.appendChild(imageSwap);
    card.appendChild(content);

    return card;
}


/* =========================
PRODUCT IMAGE HOVER PRELOAD
========================= */

function initializeProductImageSwaps(root = document) {
    root
        .querySelectorAll(".product-image-swap .product-image-secondary[data-src]")
        .forEach(secondaryImage => {
            const alternateSource = secondaryImage.getAttribute("data-src");
            const swapContainer = secondaryImage.closest(".product-image-swap");

            if (!alternateSource || !swapContainer) {
                return;
            }

            const preloader = new Image();

            preloader.addEventListener("load", function () {
                secondaryImage.src = alternateSource;
                secondaryImage.removeAttribute("data-src");
                swapContainer.classList.add("is-swap-ready");
            });

            preloader.src = alternateSource;
        });
}


/* =========================
PRODUCT SHOWCASE FILTER + PAGINATION
========================= */

function getShowcaseProducts() {
    return Array.from(
        document.querySelectorAll(".product-showcase-section .product-card[data-category]")
    );
}

function getFilteredShowcaseProducts() {
    return getShowcaseProducts().filter(product => {
        const productCategory = product.getAttribute("data-category");
        return activeProductCategory === "all" || productCategory === activeProductCategory;
    });
}

function getPaginationItems(currentPage, totalPages) {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, "ellipsis", totalPages];
    }

    if (currentPage >= totalPages - 2) {
        return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    }

    return [
        1,
        "ellipsis",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "ellipsis",
        totalPages
    ];
}

function setProductStatus(message = "", isError = false) {
    const status = document.getElementById("product-status");

    if (!status) {
        return;
    }

    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("is-error", Boolean(isError));
}

function renderProductPagination(totalPages) {
    const pagination = document.getElementById("product-pagination");

    if (!pagination) {
        return;
    }

    pagination.innerHTML = "";

    if (totalPages <= 0) {
        return;
    }

    const previousButton = document.createElement("button");
    previousButton.className = "product-page-arrow";
    previousButton.type = "button";
    previousButton.setAttribute("aria-label", "Previous product page");
    previousButton.disabled = activeProductPage <= 1;
    previousButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>';
    previousButton.addEventListener("click", function () {
        setProductPage(activeProductPage - 1);
    });
    pagination.appendChild(previousButton);

    getPaginationItems(activeProductPage, totalPages).forEach(item => {
        if (item === "ellipsis") {
            const ellipsis = document.createElement("span");
            ellipsis.className = "product-page-ellipsis";
            ellipsis.setAttribute("aria-hidden", "true");
            ellipsis.textContent = "…";
            pagination.appendChild(ellipsis);
            return;
        }

        const pageButton = document.createElement("button");
        const isActive = item === activeProductPage;
        pageButton.className = `product-page-btn${isActive ? " is-active" : ""}`;
        pageButton.type = "button";
        pageButton.textContent = item;
        pageButton.setAttribute("aria-label", `Show product page ${item}`);

        if (isActive) {
            pageButton.setAttribute("aria-current", "page");
            pageButton.disabled = true;
        } else {
            pageButton.addEventListener("click", function () {
                setProductPage(item);
            });
        }

        pagination.appendChild(pageButton);
    });

    const nextButton = document.createElement("button");
    nextButton.className = "product-page-arrow";
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Next product page");
    nextButton.disabled = activeProductPage >= totalPages;
    nextButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>';
    nextButton.addEventListener("click", function () {
        setProductPage(activeProductPage + 1);
    });
    pagination.appendChild(nextButton);
}

function renderProductPage() {
    const allProducts = getShowcaseProducts();
    const pagination = document.getElementById("product-pagination");

    if (!allProducts.length) {
        if (pagination) {
            pagination.innerHTML = "";
        }
        return;
    }

    const filteredProducts = getFilteredShowcaseProducts();

    if (!filteredProducts.length) {
        allProducts.forEach(product => {
            product.style.display = "none";
        });

        setProductStatus("No products found in this category.");
        renderProductPagination(0);
        return;
    }

    setProductStatus("");

    const totalPages = Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE);
    activeProductPage = Math.max(1, Math.min(activeProductPage, totalPages));

    const pageStart = (activeProductPage - 1) * PRODUCT_PAGE_SIZE;
    const pageEnd = pageStart + PRODUCT_PAGE_SIZE;
    const visibleProducts = new Set(filteredProducts.slice(pageStart, pageEnd));

    allProducts.forEach(product => {
        product.style.display = visibleProducts.has(product) ? "" : "none";
    });

    renderProductPagination(totalPages);
}

function setProductPage(page) {
    const filteredProducts = getFilteredShowcaseProducts();

    if (!filteredProducts.length) {
        return;
    }

    const totalPages = Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE);
    const nextPage = Math.max(1, Math.min(page, totalPages));

    if (nextPage === activeProductPage) {
        return;
    }

    activeProductPage = nextPage;
    renderProductPage();

    const showcase = document.querySelector(".product-showcase-section");
    if (showcase) {
        showcase.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function filterProducts(category, button) {
    activeProductCategory = String(category || "all").trim().toLowerCase();
    activeProductPage = 1;

    document.querySelectorAll(".filter-btn").forEach(filterButton => {
        filterButton.classList.remove("active");
        filterButton.setAttribute("aria-pressed", "false");
    });

    if (button) {
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
    }

    renderProductPage();
}

async function loadProductShowcase() {
    const productGrid = document.getElementById("product-grid");

    if (!productGrid) {
        return;
    }

    setProductStatus("Loading products…");
    renderProductPagination(0);

    try {
        const products = await fetchProductData();

        productGrid.replaceChildren();

        products.forEach(product => {
            productGrid.appendChild(createProductCard(product));
        });

        if (!products.length) {
            setProductStatus("No products are currently available.");
            renderProductPagination(0);
            return;
        }

        initializeProductImageSwaps(productGrid);
        renderProductPage();
    } catch (error) {
        console.error("Failed to load Product Showcase:", error);
        productGrid.replaceChildren();
        renderProductPagination(0);

        const message = window.location.protocol === "file:"
            ? "Local product data requires a local web server. Open this project with VS Code Live Server instead of double-clicking the HTML file."
            : "Products could not be loaded from data/product-card.json.";

        setProductStatus(message, true);
    }
}


/* =========================
HOME FEATURED PRODUCTS
LOCAL JSON: home = 1
========================= */

function setFeaturedProductStatus(message = "", isError = false) {
    const status = document.getElementById("featured-product-status");

    if (!status) {
        return;
    }

    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("is-error", Boolean(isError));
}

async function loadFeaturedProducts() {
    const featuredGrid = document.getElementById("featured-products-grid");

    if (!featuredGrid) {
        return;
    }

    setFeaturedProductStatus("Loading featured products…");

    try {
        const products = await fetchProductData();
        const featuredProducts = products.filter(product => Number(product.home) === 1);

        featuredGrid.replaceChildren();

        featuredProducts.forEach(product => {
            featuredGrid.appendChild(createProductCard(product));
        });

        if (!featuredProducts.length) {
            setFeaturedProductStatus("No featured products are currently selected.");
            return;
        }

        setFeaturedProductStatus("");
        initializeProductImageSwaps(featuredGrid);
    } catch (error) {
        console.error("Failed to load Featured Products:", error);
        featuredGrid.replaceChildren();

        const message = window.location.protocol === "file:"
            ? "Local product data requires a local web server. Open this project with VS Code Live Server instead of double-clicking the HTML file."
            : "Featured products could not be loaded from data/product-card.json.";

        setFeaturedProductStatus(message, true);
    }
}

loadProductShowcase();
loadFeaturedProducts();
initializeProductImageSwaps();


/* =========================
SCROLL ANIMATION
========================= */

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                }
            });
        },
        {
            threshold: 0.15
        }
    );

    document
        .querySelectorAll(
            ".product-card, .factory-card, .collection-card, .about-grid"
        )
        .forEach(item => {
            observer.observe(item);
        });
}


/* =========================
CONTACT FORM
========================= */

const contactForm = document.getElementById("contactForm");

if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
        event.preventDefault();

        alert(
            "Thank you for contacting YD. We will reply as soon as possible."
        );

        contactForm.reset();
    });
}


/* =========================
SMOOTH SCROLL
========================= */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (event) {
        const href = this.getAttribute("href");

        if (!href || href === "#") {
            return;
        }

        const target = document.querySelector(href);

        if (target) {
            event.preventDefault();
            target.scrollIntoView({
                behavior: "smooth"
            });
        }
    });
});


/* =========================
ACTIVE NAVIGATION
========================= */

function normalizePagePath(value) {
    const cleanValue = (value || "")
        .split("?")[0]
        .split("#")[0]
        .replace(/^\/+|\/+$/g, "");

    const lastSegment = cleanValue.split("/").pop() || "index";
    return lastSegment.replace(/\.html$/i, "") || "index";
}

const currentPage = normalizePagePath(window.location.pathname);

document.querySelectorAll(".nav-menu a").forEach(link => {
    const linkPage = normalizePagePath(link.getAttribute("href"));

    if (linkPage === currentPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
    }
});


/* =========================
ABOUT GALLERY SLIDER
========================= */

(function initializeGallerySlider() {
    const slides = document.querySelectorAll(".gallery-slide");
    const dots = document.querySelectorAll(".gallery-dot");
    const nextButton = document.querySelector(".gallery-next");
    const previousButton = document.querySelector(".gallery-prev");

    if (!slides.length) {
        return;
    }

    let currentSlide = 0;
    let autoPlayTimer = null;

    function showSlide(index) {
        currentSlide = (index + slides.length) % slides.length;

        slides.forEach(slide => {
            slide.classList.remove("active");
        });

        dots.forEach(dot => {
            dot.classList.remove("active");
        });

        slides[currentSlide].classList.add("active");

        if (dots[currentSlide]) {
            dots[currentSlide].classList.add("active");
        }
    }

    function showNextSlide() {
        showSlide(currentSlide + 1);
    }

    function restartAutoPlay() {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
        }

        autoPlayTimer = setInterval(showNextSlide, 3000);
    }

    if (nextButton) {
        nextButton.addEventListener("click", function () {
            showNextSlide();
            restartAutoPlay();
        });
    }

    if (previousButton) {
        previousButton.addEventListener("click", function () {
            showSlide(currentSlide - 1);
            restartAutoPlay();
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener("click", function () {
            showSlide(index);
            restartAutoPlay();
        });
    });

    showSlide(0);
    restartAutoPlay();
})();


/* =========================
WHY CHOOSE YD REVEAL
========================= */

const revealElements = document.querySelectorAll(
    ".reveal-left, .reveal-right"
);

if (revealElements.length && "IntersectionObserver" in window) {
    const whyObserver = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                    whyObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.2
        }
    );

    revealElements.forEach(element => {
        whyObserver.observe(element);
    });
}

/* =========================
ABOUT COMPANY MILESTONES
========================= */
(function initializeMilestoneSlider() {
    const root = document.querySelector(".milestones-section");

    if (!root) {
        return;
    }

    const track = root.querySelector(".milestone-track");
    const panels = Array.from(root.querySelectorAll(".milestone-panel"));
    const yearButtons = Array.from(root.querySelectorAll(".milestone-year-button"));
    const previousButton = root.querySelector(".milestone-prev");
    const nextButton = root.querySelector(".milestone-next");
    const viewport = root.querySelector(".milestone-viewport");

    if (!track || !panels.length || !previousButton || !nextButton || !viewport) {
        return;
    }

    let activeIndex = 0;
    let touchStartX = null;

    function showMilestone(index) {
        const boundedIndex = Math.max(0, Math.min(index, panels.length - 1));
        activeIndex = boundedIndex;

        track.style.transform = `translate3d(-${activeIndex * 100}%, 0, 0)`;

        panels.forEach((panel, panelIndex) => {
            const isActive = panelIndex === activeIndex;
            panel.classList.toggle("is-active", isActive);
            panel.setAttribute("aria-hidden", isActive ? "false" : "true");
        });

        yearButtons.forEach((button, buttonIndex) => {
            const isActive = buttonIndex === activeIndex;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-current", isActive ? "true" : "false");
        });

        previousButton.disabled = activeIndex === 0;
        nextButton.disabled = activeIndex === panels.length - 1;
    }

    previousButton.addEventListener("click", function () {
        showMilestone(activeIndex - 1);
    });

    nextButton.addEventListener("click", function () {
        showMilestone(activeIndex + 1);
    });

    yearButtons.forEach((button, index) => {
        button.addEventListener("click", function () {
            showMilestone(index);
        });
    });

    viewport.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            showMilestone(activeIndex - 1);
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            showMilestone(activeIndex + 1);
        }
    });

    viewport.addEventListener("touchstart", function (event) {
        touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });

    viewport.addEventListener("touchend", function (event) {
        if (touchStartX === null) {
            return;
        }

        const distance = event.changedTouches[0].clientX - touchStartX;
        touchStartX = null;

        if (Math.abs(distance) < 48) {
            return;
        }

        showMilestone(distance > 0 ? activeIndex - 1 : activeIndex + 1);
    }, { passive: true });

    showMilestone(0);
})();


/* =========================
MOBILE / TABLET NAVIGATION
========================= */
(function initializeResponsiveNavigation() {
    const header = document.getElementById("main-header");
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-menu");

    if (!header || !toggle || !menu) {
        return;
    }

    function setMenuState(isOpen) {
        header.classList.toggle("menu-open", isOpen);
        document.body.classList.toggle("nav-open", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    }

    toggle.addEventListener("click", function () {
        setMenuState(!header.classList.contains("menu-open"));
    });

    menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", function () {
            setMenuState(false);
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            setMenuState(false);
            toggle.focus();
        }
    });

    document.addEventListener("click", function (event) {
        if (header.classList.contains("menu-open") && !header.contains(event.target)) {
            setMenuState(false);
        }
    });

    const desktopQuery = window.matchMedia("(min-width: 981px)");
    const resetForDesktop = event => {
        if (event.matches) {
            setMenuState(false);
        }
    };

    if (typeof desktopQuery.addEventListener === "function") {
        desktopQuery.addEventListener("change", resetForDesktop);
    } else if (typeof desktopQuery.addListener === "function") {
        desktopQuery.addListener(resetForDesktop);
    }
})();
