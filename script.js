const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const homeSearch = document.getElementById("homeSearch");
const contactForm = document.getElementById("contactForm");
const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
});

homeSearch.addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Eco-home search is ready for your next integration.");
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Thanks. We will send green home options soon.");
  contactForm.reset();
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("show");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.18 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
