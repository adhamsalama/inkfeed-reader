function escapeHtml(text) {
  if (!text) return "";
  var div = document.createElement("div");
  setText(div, text);
  return div.innerHTML;
}

function downloadBlob(blob, filename) {
  if (typeof URL !== "undefined" && URL.createObjectURL) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
  return false;
}
