(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toText(value) {
    return escapeHtml(value).replaceAll(/\n/g, "<br>");
  }

  function getFileBadge(name, type) {
    const extension = String(name || "")
      .split(".")
      .pop()
      .trim()
      .toUpperCase();
    if (extension && extension !== String(name || "").toUpperCase()) {
      return extension.slice(0, 4) || "FILE";
    }

    if (type && String(type).startsWith("image/")) {
      return "IMG";
    }

    return "FILE";
  }

  function renderAttachment(message) {
    if (!message || !message.fileUrl) {
      return "";
    }

    const fileLabel = message.originalName || "Attachment";
    const isImage = String(message.fileType || "").startsWith("image/");

    if (isImage) {
      return `
        <a class="attachment-card attachment-card--image" href="${escapeHtml(message.fileUrl)}" target="_blank" rel="noreferrer">
          <img class="attachment-card__image" src="${escapeHtml(message.fileUrl)}" alt="${escapeHtml(fileLabel)}">
          <div class="attachment-card__meta">
            <strong>${escapeHtml(fileLabel)}</strong>
            <small>${escapeHtml(message.fileType || "Image attachment")}</small>
          </div>
        </a>
      `;
    }

    return `
      <a class="attachment-card attachment-card--file" href="${escapeHtml(message.fileUrl)}" target="_blank" rel="noreferrer" download>
        <div class="attachment-card__icon">${escapeHtml(getFileBadge(fileLabel, message.fileType))}</div>
        <div class="attachment-card__meta">
          <strong>${escapeHtml(fileLabel)}</strong>
          <small>${escapeHtml(message.fileType || "File attachment")}</small>
        </div>
      </a>
    `;
  }

  function renderMessageHTML(message, mode, currentUserId) {
    const sender =
      message.sender && message.sender.username
        ? message.sender
        : { username: message.senderName || "Anonymous" };
    const senderId =
      sender._id || sender.id || message.sender || message.senderId;
    const isMine = String(senderId || "") === String(currentUserId || "");
    const timestamp = new Date(
      message.uploadedAt || message.createdAt || Date.now(),
    ).toLocaleString();
    const body = [];

    if (mode === "group") {
      body.push(
        `<p><strong>@${escapeHtml(sender.username)}:</strong>${message.content ? ` ${toText(message.content)}` : ""}</p>`,
      );
    } else if (message.content) {
      body.push(`<p>${toText(message.content)}</p>`);
    }

    body.push(renderAttachment(message));

    if (mode === "private") {
      body.push(
        `<div class="message-meta"><small>${escapeHtml(timestamp)}</small><span class="receipt-pill">${escapeHtml(message.status || "sent")}</span></div>`,
      );
    } else {
      body.push(
        `<div class="message-meta"><small>${escapeHtml(timestamp)}</small></div>`,
      );
    }

    return `
      <article class="message-bubble ${isMine ? "is-me" : "is-them"}" data-message-id="${escapeHtml(message._id || "")}">
        ${body.join("")}
      </article>
    `;
  }

  window.WKMessageRenderer = {
    escapeHtml,
    renderAttachment,
    renderMessageHTML,
  };
})();
