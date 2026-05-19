(function () {
  if (!window.currentUser || typeof window.io !== "function") {
    return;
  }

  const socket = window.io({ query: { userId: window.currentUser.id } });
  window.WKSocket = socket;

  const messageStream = document.querySelector("[data-message-stream]");
  const typingStatus = document.querySelector("[data-typing-status]");
  const badge = document.getElementById("notification-badge");
  const notificationList = document.querySelector("[data-notification-list]");

  function renderMessage(message, mode) {
    if (!messageStream || !window.WKMessageRenderer) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = window.WKMessageRenderer.renderMessageHTML(
      message,
      mode,
      window.currentUser.id,
    );

    const article = wrapper.firstElementChild;
    if (!article) {
      return;
    }

    messageStream.appendChild(article);
    article.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  socket.on("chat:message", (message) => {
    if (window.chatContext && window.chatContext.mode === "private") {
      renderMessage(message, "private");
    }
  });

  socket.on("group:message", (message) => {
    if (window.chatContext && window.chatContext.mode === "group") {
      renderMessage(message, "group");
    }
  });

  socket.on("chat:seen", ({ messageId }) => {
    const receipt = document.querySelector(
      `[data-message-id="${messageId}"] .receipt-pill`,
    );
    if (receipt) {
      receipt.textContent = "seen";
    }
  });

  socket.on("presence:update", ({ userId, isOnline }) => {
    if (
      window.chatContext &&
      window.chatContext.otherUserId &&
      String(userId) === String(window.chatContext.otherUserId)
    ) {
      const statusPill = document.querySelector(".status-pill");
      if (statusPill) {
        statusPill.textContent = isOnline ? "Online" : "Offline";
        statusPill.classList.toggle("is-online", Boolean(isOnline));
        statusPill.classList.toggle("is-offline", !isOnline);
      }
    }
  });

  socket.on("typing:update", ({ isTyping }) => {
    if (typingStatus) {
      typingStatus.textContent = isTyping ? "Typing..." : "";
    }
  });

  socket.on("notification:new", (notification) => {
    if (badge) {
      badge.textContent = String(Number(badge.textContent || "0") + 1);
    }

    if (notificationList) {
      const item = document.createElement("a");
      item.className = "notification-item";
      item.href = notification.link;
      item.innerHTML = `<strong>${window.WKMessageRenderer ? window.WKMessageRenderer.escapeHtml(notification.title) : notification.title}</strong><span>${window.WKMessageRenderer ? window.WKMessageRenderer.escapeHtml(notification.message) : notification.message}</span>`;
      notificationList.prepend(item);
    }
  });

  async function markSeen(messageId) {
    try {
      await fetch(`/chat/messages/${messageId}/seen`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      void error;
    }
  }

  if (
    window.chatContext &&
    window.chatContext.mode === "private" &&
    messageStream
  ) {
    messageStream
      .querySelectorAll(".message-bubble.is-them[data-message-id]")
      .forEach((bubble) => {
        markSeen(bubble.dataset.messageId);
      });
  }
})();
