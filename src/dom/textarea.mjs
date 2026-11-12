export function autosizeTextarea(textarea) {
  const previous = {
    height: textarea.style.height,
    overflowY: textarea.style.overflowY,
    resize: textarea.style.resize,
  };
  let width = textarea.getBoundingClientRect().width;
  function resize() {
    if (!textarea.isConnected || !textarea.getClientRects().length) return;
    textarea.style.height = "auto";
    const style = getComputedStyle(textarea);
    const extra =
      style.boxSizing === "border-box"
        ? parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
        : -parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    textarea.style.height = `${Math.ceil(textarea.scrollHeight + extra)}px`;
  }
  textarea.style.overflowY = "hidden";
  textarea.style.resize = "none";
  textarea.addEventListener("input", resize);
  const observer = new ResizeObserver(() => {
    const next = textarea.getBoundingClientRect().width;
    if (next !== width) {
      width = next;
      resize();
    }
  });
  observer.observe(textarea);
  resize();
  return {
    resize,
    destroy() {
      observer.disconnect();
      textarea.removeEventListener("input", resize);
      Object.assign(textarea.style, previous);
    },
  };
}
