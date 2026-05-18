(function () {
  const copyButtons = document.querySelectorAll("[data-copy-link]");

  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const link = button.dataset.link || "";
      try {
        await navigator.clipboard.writeText(link);
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = "Copy anonymous link";
        }, 1400);
      } catch (error) {
        void error;
      }
    });
  });
})();
