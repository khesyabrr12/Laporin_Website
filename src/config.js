(() => {
  const isLocal =
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  window.LAPORIN_API_BASE_URL = isLocal
    ? "http://localhost:3000/api"
    : "https://laporin-backend.vercel.app/api";
})();
