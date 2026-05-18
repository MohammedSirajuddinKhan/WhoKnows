(function () {
  const privateForm = document.querySelector("[data-private-chat-form]");
  const groupForm = document.querySelector("[data-group-chat-form]");

  function emitTyping(state) {
    if (!window.WKSocket || !window.chatContext) {
      return;
    }

    if (window.chatContext.mode === "private") {
      window.WKSocket.emit(state ? "typing:start" : "typing:stop", {
        roomId: window.chatContext.chatId,
        toUserId: window.chatContext.otherUserId,
      });
      return;
    }

    window.WKSocket.emit(state ? "typing:start" : "typing:stop", {
      groupId: window.chatContext.groupId,
    });
  }

  function bindForm(form, mode) {
    if (!form) {
      return;
    }

    let typingTimer;
    const input = form.querySelector(
      'input[name="content"], textarea[name="content"]',
    );

    if (input) {
      input.addEventListener("input", () => {
        emitTyping(true);
        window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => emitTyping(false), 900);
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      emitTyping(false);

      const formData = new FormData(form);
      const body = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        body.append(key, value);
      }

      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body,
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        form.reset();
        if (
          !window.WKSocket &&
          data.message &&
          window.chatContext &&
          window.chatContext.mode === mode
        ) {
          const stream = document.querySelector("[data-message-stream]");
          if (stream) {
            const bubble = document.createElement("article");
            bubble.className = "message-bubble is-me";
            bubble.innerHTML = `<p>${data.message.content}</p><small>${new Date(data.message.createdAt || Date.now()).toLocaleString()}</small>`;
            stream.appendChild(bubble);
          }
        }
      }
    });
  }

  bindForm(privateForm, "private");
  bindForm(groupForm, "group");
})();
