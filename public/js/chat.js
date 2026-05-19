(function () {
  const privateForm = document.querySelector("[data-private-chat-form]");
  const groupForm = document.querySelector("[data-group-chat-form]");
  const profileAvatarInput = document.querySelector("[data-avatar-input]");
  const profileAvatarPreview = document.querySelector("[data-avatar-preview]");

  const emojiOptions = [
    "😀",
    "😄",
    "😁",
    "😂",
    "😊",
    "😍",
    "🤝",
    "🙏",
    "💬",
    "📎",
    "🖼️",
    "📄",
    "📁",
    "✨",
    "🚀",
    "👍",
    "👀",
    "❤️",
    "🔥",
    "🌟",
  ];

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

  function getComposerShell(form) {
    return form.closest(".composer-shell") || form.parentElement;
  }

  function getMessageStream() {
    return document.querySelector("[data-message-stream]");
  }

  function insertTextAtCursor(input, text) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.setRangeText(text, start, end, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  function renderEmojiPicker(panel, input) {
    if (!panel) {
      return;
    }

    panel.innerHTML = `
      <div class="emoji-popover__header">
        <strong>Emoji</strong>
        <button type="button" class="emoji-popover__close" data-emoji-close aria-label="Close emoji picker">×</button>
      </div>
      <div class="emoji-grid">
        ${emojiOptions
          .map(
            (emoji) => `
          <button type="button" class="emoji-grid__item" data-emoji-value="${emoji}">${emoji}</button>
        `,
          )
          .join("")}
      </div>
    `;

    panel.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-emoji-close]");
      const emojiButton = event.target.closest("[data-emoji-value]");

      if (closeButton) {
        panel.hidden = true;
        return;
      }

      if (emojiButton && input) {
        insertTextAtCursor(input, emojiButton.dataset.emojiValue || "");
      }
    });
  }

  function previewSelectedFile(file, preview) {
    if (!preview) {
      return;
    }

    if (!file) {
      preview.hidden = true;
      preview.innerHTML = "";
      return;
    }

    const isImage = file.type && file.type.startsWith("image/");
    const objectUrl = URL.createObjectURL(file);

    preview.hidden = false;
    preview.innerHTML = isImage
      ? `
        <div class="attachment-preview__image-wrap">
          <img class="attachment-preview__image" src="${objectUrl}" alt="${file.name}">
        </div>
        <div class="attachment-preview__body">
          <strong>${window.WKMessageRenderer.escapeHtml(file.name)}</strong>
          <small>${window.WKMessageRenderer.escapeHtml(file.type || "Image")}</small>
        </div>
        <button type="button" class="attachment-preview__remove" data-remove-attachment>Remove</button>
      `
      : `
        <div class="attachment-preview__icon">${window.WKMessageRenderer.escapeHtml(
          file.name.split(".").pop().slice(0, 4).toUpperCase() || "FILE",
        )}</div>
        <div class="attachment-preview__body">
          <strong>${window.WKMessageRenderer.escapeHtml(file.name)}</strong>
          <small>${window.WKMessageRenderer.escapeHtml(file.type || "File")}</small>
        </div>
        <button type="button" class="attachment-preview__remove" data-remove-attachment>Remove</button>
      `;

    preview.dataset.objectUrl = objectUrl;
  }

  function clearPreview(preview) {
    if (!preview) {
      return;
    }

    if (preview.dataset.objectUrl) {
      URL.revokeObjectURL(preview.dataset.objectUrl);
    }

    preview.hidden = true;
    preview.innerHTML = "";
    delete preview.dataset.objectUrl;
  }

  function setUploadState(progress, active, value) {
    if (!progress) {
      return;
    }

    progress.hidden = !active;
    const bar = progress.querySelector("[data-upload-progress-bar]");
    const label = progress.querySelector("[data-upload-progress-label]");
    const cancel = progress.querySelector("[data-upload-cancel]");

    if (bar) {
      bar.style.width = `${Math.max(0, Math.min(100, value || 0))}%`;
    }

    if (label) {
      label.textContent = active
        ? `Uploading ${Math.round(value || 0)}%`
        : "Uploading...";
    }

    if (cancel) {
      cancel.hidden = !active;
    }
  }

  function setAvatarPreview(file) {
    if (!profileAvatarPreview) {
      return;
    }

    if (profileAvatarPreview.dataset.objectUrl) {
      URL.revokeObjectURL(profileAvatarPreview.dataset.objectUrl);
      delete profileAvatarPreview.dataset.objectUrl;
    }

    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    profileAvatarPreview.src = objectUrl;
    profileAvatarPreview.dataset.objectUrl = objectUrl;
  }

  if (profileAvatarInput && profileAvatarPreview) {
    profileAvatarInput.addEventListener("change", () => {
      setAvatarPreview(profileAvatarInput.files && profileAvatarInput.files[0]);
    });
  }

  function bindForm(form, mode) {
    if (!form) {
      return;
    }

    const shell = getComposerShell(form);
    const preview = shell
      ? shell.querySelector("[data-attachment-preview]")
      : null;
    const progress = shell
      ? shell.querySelector("[data-upload-progress]")
      : null;
    const emojiPanel = shell
      ? shell.querySelector("[data-emoji-picker]")
      : null;
    const emojiToggle = form.querySelector("[data-emoji-toggle]");
    const triggerButtons = form.querySelectorAll("[data-file-trigger]");
    const attachmentInputs = Array.from(
      form.querySelectorAll("[data-attachment-input]"),
    );
    const contentInput = form.querySelector(
      'input[name="content"], textarea[name="content"]',
    );
    const cancelButton = shell
      ? shell.querySelector("[data-upload-cancel]")
      : null;

    let typingTimer;
    let activeRequest = null;

    if (contentInput) {
      contentInput.addEventListener("input", () => {
        emitTyping(true);
        window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => emitTyping(false), 900);
      });
    }

    if (emojiToggle && emojiPanel && contentInput) {
      renderEmojiPicker(emojiPanel, contentInput);
      emojiToggle.addEventListener("click", () => {
        emojiPanel.hidden = !emojiPanel.hidden;
      });

      document.addEventListener("click", (event) => {
        if (
          !emojiPanel.contains(event.target) &&
          !emojiToggle.contains(event.target)
        ) {
          emojiPanel.hidden = true;
        }
      });
    }

    triggerButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetName = button.dataset.fileTrigger;
        const targetInput = form.querySelector(
          `[data-attachment-input="${targetName}"]`,
        );
        if (targetInput) {
          targetInput.click();
        }
      });
    });

    attachmentInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const [selectedFile] = input.files || [];
        const otherInputs = attachmentInputs.filter((item) => item !== input);
        otherInputs.forEach((otherInput) => {
          otherInput.value = "";
        });

        if (selectedFile) {
          previewSelectedFile(selectedFile, preview);
        } else {
          const hasAnyFile = attachmentInputs.some(
            (item) => item.files && item.files.length,
          );
          if (!hasAnyFile) {
            clearPreview(preview);
          }
        }
      });
    });

    if (preview) {
      preview.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-attachment]");
        if (!removeButton) {
          return;
        }

        attachmentInputs.forEach((input) => {
          input.value = "";
        });
        clearPreview(preview);
      });
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        if (activeRequest) {
          activeRequest.abort();
        }
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      emitTyping(false);

      const formData = new FormData(form);
      const xhr = new XMLHttpRequest();
      activeRequest = xhr;
      setUploadState(progress, true, 0);

      xhr.open("POST", form.action);
      xhr.responseType = "json";
      xhr.setRequestHeader("Accept", "application/json");

      xhr.upload.addEventListener("progress", (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const ratio = (progressEvent.loaded / progressEvent.total) * 100;
        setUploadState(progress, true, ratio);
      });

      xhr.addEventListener("load", () => {
        activeRequest = null;
        setUploadState(progress, false, 100);

        const data = xhr.response || {};
        if (xhr.status >= 200 && xhr.status < 300) {
          form.reset();
          attachmentInputs.forEach((input) => {
            input.value = "";
          });
          clearPreview(preview);

          if (
            !window.WKSocket &&
            data.message &&
            window.chatContext &&
            window.chatContext.mode === mode
          ) {
            const stream = getMessageStream();
            if (stream && window.WKMessageRenderer) {
              const bubble = document.createElement("div");
              bubble.innerHTML = window.WKMessageRenderer.renderMessageHTML(
                data.message,
                mode,
                window.currentUser && window.currentUser.id,
              );
              const article = bubble.firstElementChild;
              if (article) {
                stream.appendChild(article);
                article.scrollIntoView({ behavior: "smooth", block: "end" });
              }
            }
          }
        } else if (data && data.message) {
          window.alert(data.message);
        }
      });

      xhr.addEventListener("error", () => {
        activeRequest = null;
        setUploadState(progress, false, 0);
      });

      xhr.addEventListener("abort", () => {
        activeRequest = null;
        setUploadState(progress, false, 0);
      });

      xhr.send(formData);
    });
  }

  bindForm(privateForm, "private");
  bindForm(groupForm, "group");
})();
