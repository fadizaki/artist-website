const params = new URLSearchParams(window.location.search);
const requestedCollection = params.get("collection") || "assorted-fan-arts";
const collection = COLLECTIONS.find((item) => item.id === requestedCollection) || COLLECTIONS[0];
const title = document.querySelector("#collection-title");
const description = document.querySelector("#collection-description");
const galleryGrid = document.querySelector("#gallery-grid");

document.title = `${collection.title} | Saif Zulfiqar`;
title.textContent = collection.title;
description.textContent = collection.description;

collection.works.forEach((path, index) => {
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const fileName = decodeURIComponent(path.split("/").pop().replace(/\.[^.]+$/, ""));

  figure.className = "gallery-item reveal reveal-slide";
  figure.style.transitionDelay = `${Math.min(index * 55, 420)}ms`;
  image.src = encodeURI(path);
  image.alt = fileName.replace(/[-_]+/g, " ");
  image.loading = "lazy";
  caption.textContent = fileName.replace(/[-_]+/g, " ");

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
