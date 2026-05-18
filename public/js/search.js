(function () {
  const input = document.querySelector("[data-user-search]");
  const results = document.querySelector("[data-search-results]");

  if (!input || !results) {
    return;
  }

  let timeoutId;

  function render(users) {
    if (!users.length) {
      results.innerHTML =
        '<p class="muted-text">No users matched your search.</p>';
      return;
    }

    results.innerHTML = users
      .map(
        (user) => `
      <article class="list-item user-card">
        <div>
          <strong>@${user.username}</strong>
          <p>${user.bio || "No bio yet."}</p>
        </div>
        <div class="inline-actions">
          <a class="secondary-button" href="/chat/private/${user._id}">Chat</a>
          <form action="/users/requests/friend/${user._id}" method="POST" class="inline-form">
            <button class="secondary-button" type="submit">Add friend</button>
          </form>
        </div>
      </article>
    `,
      )
      .join("");
  }

  async function search(value) {
    if (!value.trim()) {
      results.innerHTML =
        '<p class="muted-text">Search for someone by username to start a request or private chat.</p>';
      return;
    }

    const response = await fetch(
      `/users/search/instant?q=${encodeURIComponent(value)}`,
      {
        headers: { Accept: "application/json" },
      },
    );
    const data = await response.json();
    render(data.results || []);
  }

  input.addEventListener("input", () => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => search(input.value), 220);
  });
})();
