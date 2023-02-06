"use strict";
// ----------------------------
// Converts numeric degrees to radians
function toRad(value) {
  return (value * Math.PI) / 180;
}
function calculateDistance({
  coordinatesOne: { latitude: lat1, longitude: lon1 },
  coordinatesTwo: { latitude: lat2, longitude: lon2 },
}) {
  var R = 6371; // km
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}
//59.9087433,10.7546471
const addressOne = {
  latitude: 59.9087433,
  longitude: 10.7546471,
};
// //59.9206802,10.7273792
// const addressTwo = {
//   lat: 59.9206802,
//   lon: 10.7273792,
// };
// console.log(calculateDistance({ addressOne, addressTwo }));
async function geolocation(options) {
  if (!navigator.geolocation) throw new Error("Geolocation is not supported");
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  );
}
function setAddressInInput(value) {
  const findMyLocationElement = document.querySelector(
    "input[nj-locator-element='address-input']"
  );
  if (!findMyLocationElement) throw new Error("No input element found");
  findMyLocationElement.value = `${value}`;
}
async function getCoordinatesFromAddress(address) {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?text=${address}&f=pjson`;
  const response = await fetch(url);
  const data = await response.json();
  const { y: latitude, x: longitude } = data.locations[0].feature.geometry;
  if (!latitude || !longitude) throw new Error("No coordinates found");
  return { latitude, longitude };
}
async function getAddressFromCoordinates({ latitude, longitude }) {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${longitude},${latitude}&f=pjson`;
  const response = await fetch(url);
  const data = await response.json();
  const { Match_addr } = data.address;
  return Match_addr;
}
async function getBrowserGeolocation() {
  const position = await geolocation();
  const { latitude, longitude } = position.coords;
  return { latitude, longitude };
}
function addDistanceToElements(toCoordinates) {
  const listItems = document.querySelectorAll(
    "div[nj-locator-element='list-item']"
  );
  listItems.forEach((listItem) => {
    const latitudeText = listItem.querySelector(
      "p[nj-locator-element='latitude']"
    )?.textContent;
    const longitudeText = listItem.querySelector(
      "p[nj-locator-element='longitude']"
    )?.textContent;
    if (!latitudeText || !longitudeText) throw new Error("Missing coordinates");
    const latitude = parseFloat(latitudeText);
    const longitude = parseFloat(longitudeText);
    if (!latitude || !longitude) throw new Error("Missing coordinates");
    const distance = calculateDistance({
      coordinatesOne: toCoordinates,
      coordinatesTwo: { latitude, longitude },
    });
    listItem.setAttribute("nj-locator-distance", "" + distance);
    const distanceElement = listItem.querySelector(
      "span[nj-locator-element='distance']"
    );
    if (!distanceElement) throw new Error("No distance element found");
    distanceElement.textContent = `${distance.toFixed(2)} km`;
  });
}
function sortListElementsBasedOnDistance() {
  const listContainer = document.querySelector(
    "div[class='location-list w-dyn-items']"
  );
  if (!listContainer) throw new Error("No list container found");
  [...listContainer.children]
    .sort((a, b) => {
      const aDistance = parseFloat(a.getAttribute("nj-locator-distance") ?? "");
      const bDistance = parseFloat(b.getAttribute("nj-locator-distance") ?? "");
      if (aDistance > bDistance) return 1;
      if (aDistance < bDistance) return -1;
      return 0;
    })
    .forEach((node) => listContainer.appendChild(node));
}
// --------------------------------- Find my location functionality
async function onFindMyLocation() {
  const coordinates = await getBrowserGeolocation();
  const address = await getAddressFromCoordinates(coordinates);
  setAddressInInput(address);
  // trigger search
  onSearch();
}
(async () => {
  const findMyLocationElement = document.querySelector(
    "a[nj-locator-element='my-location-btn']"
  );
  if (!findMyLocationElement)
    throw new Error("No find my location button element found");
  findMyLocationElement.setAttribute("onclick", "onFindMyLocation()");
})();
// --------------------------------- On search functionality
async function onSearch() {
  const inputElement = document.querySelector(
    "input[nj-locator-element='address-input']"
  );
  if (!inputElement) throw new Error("No input element found");
  const address = inputElement.value;
  if (!address) throw new Error("No address found");
  const coordinates = await getCoordinatesFromAddress(address);
  addDistanceToElements(coordinates);
  sortListElementsBasedOnDistance();
}
(async () => {
  const inputElement = document.querySelector(
    "input[nj-locator-element='address-input']"
  );
  if (!inputElement) throw new Error("No input element found");
  inputElement.addEventListener("keypress", (event) => {
    event.preventDefault();
    if (event.key === "Enter") onSearch();
    else inputElement.value += event.key;
  });
})();
