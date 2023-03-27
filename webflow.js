"use strict";
// ----------------------------
// Converts numeric degrees to radians
function toRad(value) {
    return (value * Math.PI) / 180;
}
// Helper function
function calculateDistance({ coordinatesOne: { latitude: lat1, longitude: lon1 }, coordinatesTwo: { latitude: lat2, longitude: lon2 }, }) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}
// Helper function
async function geolocation(options) {
    if (!navigator.geolocation)
        throw new Error("Geolocation is not supported");
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}
// Helper function
function setAddressInInput(value) {
    const findMyLocationElement = document.querySelector("input[nj-locator-element='address-input']");
    if (!findMyLocationElement)
        throw new Error("No input element found");
    // @ts-ignore
    findMyLocationElement.value = `${value}`;
}
// Helper function
async function getCoordinatesFromAddress(address) {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?text=${address}&f=pjson`;
    const response = await fetch(url);
    const data = await response.json();
    const { y: latitude, x: longitude } = data.locations[0].feature.geometry;
    if (!latitude || !longitude)
        throw new Error("No coordinates found");
    return { latitude, longitude };
}
// Helper function
async function getAddressFromCoordinates({ latitude, longitude }) {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${longitude},${latitude}&f=pjson`;
    const response = await fetch(url);
    const data = await response.json();
    const { Match_addr } = data.address;
    return Match_addr;
}
// Helper function
async function getBrowserGeolocation() {
    const position = await geolocation();
    const { latitude, longitude } = position.coords;
    return { latitude, longitude };
}
// should this clone?
function getList(html = document) {
    const list = html.querySelector("div[nj-locator-element='list']");
    if (!list)
        throw new Error("No list element found");
    return list;
}
// should this clone?
function getListItems(html = document) {
    const list = getList(html);
    const listItems = list.querySelectorAll("div[nj-locator-element='list-item']");
    if (!listItems.length)
        throw new Error("No list items found");
    return listItems;
}
function getCoordinatesFromListItem(listItem) {
    const latitudeText = listItem.querySelector("p[nj-locator-element='latitude']")?.textContent;
    const longitudeText = listItem.querySelector("p[nj-locator-element='longitude']")?.textContent;
    if (!latitudeText || !longitudeText)
        throw new Error("Missing coordinates");
    const latitude = parseFloat(latitudeText);
    const longitude = parseFloat(longitudeText);
    if (!latitude || !longitude)
        throw new Error("Missing coordinates");
    const coordinates = { latitude, longitude };
    return coordinates;
}
// Helper function
function addDistanceToElements(toCoordinates) {
    const listItems = getListItems();
    listItems.forEach((listItem) => {
        const { latitude, longitude } = getCoordinatesFromListItem(listItem);
        const distance = calculateDistance({
            coordinatesOne: toCoordinates,
            coordinatesTwo: { latitude, longitude },
        });
        listItem.setAttribute("nj-locator-distance", "" + distance);
        const distanceElement = listItem.querySelector("span[nj-locator-element='distance']");
        if (!distanceElement)
            throw new Error("No distance element found");
        distanceElement.textContent = `${distance.toFixed(2)} km`;
    });
}
// Helper function
async function addCoordinatesToElements() {
    const listItems = getListItems();
    // @ts-ignore
    for await (const listItem of listItems) {
        const addressText = listItem.querySelector("p[nj-locator-element='address']")?.textContent;
        if (!addressText)
            throw new Error("Missing address");
        const { latitude, longitude } = await getCoordinatesFromAddress(addressText);
        const latitudeElement = listItem.querySelector("p[nj-locator-element='latitude']");
        const longitudeElement = listItem.querySelector("p[nj-locator-element='longitude']");
        if (!latitudeElement || !longitudeElement)
            throw new Error("No coordinates elements found");
        latitudeElement.textContent = `${latitude}`;
        longitudeElement.textContent = `${longitude}`;
    }
}
// Helper function
function sortListElementsBasedOnDistance() {
    const listContainer = document.querySelector("div[class='location-list w-dyn-items']");
    if (!listContainer)
        throw new Error("No list container found");
    // @ts-ignore
    [...listContainer.children]
        .sort((a, b) => {
        const aDistance = parseFloat(a.getAttribute("nj-locator-distance") ?? "");
        const bDistance = parseFloat(b.getAttribute("nj-locator-distance") ?? "");
        if (aDistance > bDistance)
            return 1;
        if (aDistance < bDistance)
            return -1;
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
    const findMyLocationElement = document.querySelector("a[nj-locator-element='my-location-btn']");
    if (!findMyLocationElement)
        throw new Error("No find my location button element found");
    findMyLocationElement.setAttribute("onclick", "onFindMyLocation()");
    // edge-case where the element has an href
    findMyLocationElement.removeAttribute("href");
})();
// --------------------------------- On search functionality
async function onSearch() {
    const inputElement = document.querySelector("input[nj-locator-element='address-input']");
    if (!inputElement)
        throw new Error("No input element found");
    // @ts-ignore
    const address = inputElement.value;
    if (!address)
        throw new Error("No address found");
    const coordinates = await getCoordinatesFromAddress(address);
    addDistanceToElements(coordinates);
    sortListElementsBasedOnDistance();
    centerMapOnCoordinates(coordinates);
}
// --------------------------------- On input functionality (buggy)
(async () => {
    const inputElement = document.querySelector("input[nj-locator-element='address-input']");
    if (!inputElement)
        throw new Error("No input element found");
    inputElement.addEventListener("keypress", (event) => {
        event.preventDefault();
        // @ts-ignore
        if (event.key === "Enter")
            onSearch();
        // @ts-ignore
        else
            inputElement.value += event.key;
    });
})();
// --------------------------------- On load functionality
(async () => {
    // delay to make sure the map is loaded - should be improved
    setTimeout(() => placeMarkersOnMap(), 300);
    // addCoordinatesToElements();
})();
//  MAP --------------------------------- MAP --------------------------------- MAP --------------------------------- MAP
function getCustomMapPinElementClone() {
    const customMapPin = document.querySelector("[nj-locator-template='map-pin']");
    if (!customMapPin)
        throw new Error("No custom marker element found");
    const clone = customMapPin.cloneNode(true);
    return clone;
}
function getCustomMapTooltipElementClone() {
    const customMapTooltip = document.querySelector("[nj-locator-template='tooltip']");
    if (!customMapTooltip)
        throw new Error("No custom tooltip element found");
    const clone = customMapTooltip.cloneNode(true);
    return clone;
}
function customTooltipWithValues({ title = null, buttonLink = null, buttonText = null, }) {
    const tooltipElement = getCustomMapTooltipElementClone();
    const buttonElement = tooltipElement.querySelector("[nj-locator-template='button']");
    const titleElement = tooltipElement.querySelector("[nj-locator-template='title']");
    if (buttonElement) {
        buttonElement.setAttribute("href", buttonLink ?? "#");
        buttonElement.textContent = buttonText;
    }
    if (titleElement) {
        titleElement.textContent = title;
    }
    return tooltipElement;
}
async function placeMarkersOnMap() {
    const infoWindow = new google.maps.InfoWindow();
    const listItems = getListItems();
    listItems.forEach((listItem) => {
        const customMapPinElement = getCustomMapPinElementClone();
        const { latitude, longitude } = getCoordinatesFromListItem(listItem);
        const marker = new google.maps.marker.AdvancedMarkerView({
            map,
            // title: "Hello mom!",
            position: { lat: latitude, lng: longitude },
            content: customMapPinElement,
        });
        // TEMP - this should be done using its own function
        const title = listItem.querySelector("p[nj-locator-element='address']")?.textContent;
        const tooltip = customTooltipWithValues({
            title,
            buttonLink: "#",
            buttonText: "Gå til side",
        });
        // @ts-ignore
        marker.addListener("click", ({ domEvent, latLng }) => {
            const { target } = domEvent;
            infoWindow.close();
            infoWindow.setContent(tooltip);
            infoWindow.open(marker.map, marker);
        });
    });
}
function centerMapOnCoordinates({ latitude, longitude }) {
    const center = new google.maps.LatLng(latitude, longitude);
    map.panTo(center);
    map.setZoom(12);
}
// global map variable
let map;
function renderMap() {
    const createdMap = new google.maps.Map(document.querySelector("div[nj-locator-element='map']"), {
        zoom: 2,
        center: { lat: 0, lng: 0 },
        mapId: "ec84e2c06284bbf7",
    });
    map = createdMap;
    // @ts-ignore - for debugging
    window.map = createdMap;
}
// --------------------------------- Inject google maps script
(async () => {
    var script = document.createElement("script");
    script.setAttribute("src", "https://maps.googleapis.com/maps/api/js?key=AIzaSyBzuLG6uS1Efah3kc7P-VTiq5QqxXq8Ik8&callback=renderMap&v=beta&libraries=marker");
    script.setAttribute("defer", "");
    document.getElementsByTagName("head")[0].appendChild(script);
})();
//  PAGINATION --------------------------------- PAGINATION --------------------------------- PAGINATION --------------------------------- PAGINATION
// --------------------------------- Check pagination functionality
function isPagination() {
    const paginationElement = document.querySelector("div[class='w-pagination-wrapper']");
    return Boolean(paginationElement);
}
// --------------------------------- Get total pages
function getPageCount() {
    const pageCountElement = document.querySelector("div[class='w-page-count']");
    if (!pageCountElement)
        throw new Error("No page count element found");
    const pageCountText = pageCountElement.textContent;
    if (!pageCountText)
        throw new Error("No page count text found");
    // [\d.][\d.]*(?!\S)
    const [currentPage, pageCount] = pageCountText.split(" / ");
    if (!currentPage || !pageCount)
        throw new Error("No page information found");
    return parseInt(pageCount);
}
// --------------------------------- Get url
function getUrl() {
    const url = window.location.href;
    return url;
}
// --------------------------------- Get HTML content from page
async function getHTMLContentFromPage(page) {
    const baseUrl = getUrl();
    const url = `${baseUrl}?page=${page}`;
    const response = await fetch(url);
    const html = await response.text();
    return html;
}
// --------------------------------- Get raw HTML content from all pages
async function getRawHTMLContentFromPages() {
    const pageCount = getPageCount();
    // TODO: put this back
    // const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
    // const htmlContent = await Promise.all(pages.map(getHTMLContentFromPage));
    // THIS IS TEMP \/
    const htmlContent = await Promise.all([1].map(async () => {
        const response = await fetch(getUrl(), {
            method: "GET",
        });
        const html = await response.text();
        return html;
    }));
    return htmlContent;
}
// --------------------------------- Get list items from HTML content
function getListItemsFromHTMLContent(htmlContent) {
    const parser = new DOMParser();
    const html = parser.parseFromString(htmlContent, "text/html");
    const listItems = getListItems(html);
    return listItems;
}
// --------------------------------- Get list items from all pages
async function getListItemsFromAllPages() {
    const htmlContent = await getRawHTMLContentFromPages();
    const listItems = htmlContent.map(getListItemsFromHTMLContent);
    return listItems.flat();
}
(async () => {
    console.log("STARTING PAGINATION");
    if (!isPagination())
        return;
    const listItems = await getListItemsFromAllPages();
    console.log("LIST ITEMS update", listItems);
})();
