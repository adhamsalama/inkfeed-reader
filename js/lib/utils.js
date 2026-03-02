function escapeHtml(text) {
  if (!text) return "";
  var div = document.createElement("div");
  setText(div, text);
  return div.innerHTML;
}
