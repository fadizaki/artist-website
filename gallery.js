const params = new URLSearchParams(window.location.search);
const requestedCollection = params.get("collection") || "assorted-fan-arts";
const collection = COLLECTIONS.find((item) => item.id === requestedCollection) || COLLECTIONS[0];
const title = document.querySelector("#collection-title");
const description = document.querySelector("#collection-description");
const galleryGrid = document.querySelector("#gallery-grid");

document.title = `${collection.title} | Saif Zulfiqar`;
title.textContent = collection.title;
description.textContent = collection.description;

collection.works.forEach((work, index) => {
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const src = typeof work === "string" ? work : work.src;
  const label = typeof work === "string"
    ? decodeURIComponent(work.split("/").pop().replace(/\.[^.]+$/, "")).replace(/[-_]+/g, " ")
    : work.title;

  figure.className = "gallery-item reveal reveal-slide";
  figure.style.transitionDelay = `${Math.min(index * 55, 420)}ms`;
  image.src = src;
  image.alt = label;
  image.loading = "lazy";
  caption.textContent = label;

  figure.append(image, caption);
  galleryGrid.append(figure);
});

const galleryObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        galleryObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".gallery-item").forEach((item) => galleryObserver.observe(item));

