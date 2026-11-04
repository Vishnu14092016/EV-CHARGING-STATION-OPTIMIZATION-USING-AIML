const message = document.querySelector("#navMessage");
function openMaps(query) {
  const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  window.open(url, "_blank", "noopener,noreferrer");
}
document.querySelector("#findNearby").addEventListener("click", () => {
  message.textContent = "Requesting your location…";
  if (!navigator.geolocation) {
    message.textContent = "Geolocation is not supported. Use the place search below.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({coords}) => openMaps(`EV charging stations near ${coords.latitude},${coords.longitude}`),
    () => { message.textContent = "Location unavailable. Opening a nearby search instead."; openMaps("EV charging stations near me"); },
    {enableHighAccuracy:true, timeout:15000}
  );
});
document.querySelector("#searchPlace").addEventListener("click", () => {
  const place = document.querySelector("#place").value.trim();
  if (!place) { message.textContent = "Enter a location first."; return; }
  openMaps(`EV charging stations near ${place}`);
});
