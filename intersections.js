//** Variables globales */

let intersectionLayer = null;  // Les points d'intersections
let gridLayer = null;          // La grille de lignes
let lines = [];                // Stocke toutes les lignes du quadrillage
let addedPoints = [];          // Stocke touts les points ajoutées
let intersectionCount = 0;     // Nombre de point de mesure
// let profondeur = 100;   // Exemple, valeur à remplacer
// let penteCorrigee = 20; // Exemple, valeur à remplacer
// let minDistanceMeters = profondeur / (penteCorrigee / 100 * 4) / 1000;

//** Taille d'une cellule */

let cellSizeMeters = 10;       // Taille initiale des cellules en mètres
let cellSizeSlider = document.getElementById("cellSizeSlider");
let cellSizeValue = document.getElementById("cellSizeValue");
cellSizeSlider.addEventListener("input", function () {
    cellSizeMeters = parseFloat(this.value);
    cellSizeValue.textContent = cellSizeMeters;
    console.log("📏 Nouvelle distance entre les sommets :", cellSizeMeters, "m");
    generateIntersections();
});

let minDistanceMeters = cellSizeMeters/5;



//** Degre d'inclinaison de la grille */

let manualRotation = 0; // en degrés
let rotationSlider = document.getElementById("rotationSlider");
let rotationValue = document.getElementById("rotationValue");

rotationSlider.addEventListener("input", function () {
    manualRotation = parseFloat(this.value);
    rotationValue.textContent = manualRotation + "°";
    generateIntersections();
});


//** Fonctions utilitaires pour gerer les rotations */

function getMainOrientation(polygon) {
    let coords = polygon.getLatLngs()[0]; // Tableau de L.LatLng
    let longestEdge = { length: 0, angle: 0 };

    for (let i = 0; i < coords.length - 1; i++) {
        let p1 = coords[i], p2 = coords[i + 1];
        let dx = p2.lng - p1.lng;
        let dy = p2.lat - p1.lat;
        let length = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        if (length > longestEdge.length) {
            longestEdge = { length, angle };
        }
    }
    // Ajuster l'angle pour qu'il soit mesuré par rapport à la verticale
    let adjustedAngle = longestEdge.angle - Math.PI / 2; // Rotation vers le Nord
    console.log("🟢 Orientation principale ajustée :", (adjustedAngle * 180 / Math.PI).toFixed(2), "°");
      
    return adjustedAngle;
}

function transformToGlobal(latlng, center, angle) {
    let oneDegreeLatMeters = 111320;  
    let oneDegreeLngMeters = 111320 * Math.cos(center.lat * Math.PI / 180);

    // Convertir en mètres par rapport au centre
    let dx = (latlng.lng - center.lng) * oneDegreeLngMeters;
    let dy = (latlng.lat - center.lat) * oneDegreeLatMeters;

    // Rotation
    let newDx = dx * Math.cos(angle) - dy * Math.sin(angle);
    let newDy = dx * Math.sin(angle) + dy * Math.cos(angle);

    // Reconvertir en degrés
    let newLng = center.lng + newDx / oneDegreeLngMeters;
    let newLat = center.lat + newDy / oneDegreeLatMeters;

    return L.latLng(newLat, newLng);
}


function rotatePolygon(polygon, center, angle) {
    let factor = Math.cos(center.lat * Math.PI / 180);

    return polygon.map(p => {
        let dx = (p.lng - center.lng) * factor;
        let dy = p.lat - center.lat;

        let newDx = dx * Math.cos(-angle) - dy * Math.sin(-angle);
        let newDy = dx * Math.sin(-angle) + dy * Math.cos(-angle);

        let newLng = (newDx / factor) + center.lng;
        let newLat = newDy + center.lat;
        return L.latLng(newLat, newLng);
    });
}


function rotateLine(line, angle, center) {
    let latlngs = line.getLatLngs();
    let rotatedLatLngs = latlngs.map(ll => transformToGlobal(ll, center, angle));
    return L.polyline(rotatedLatLngs, { color: 'black', weight: 1 });
}


//** filtrage des points de mesure */

function isTooClose(newPoint, existingPoints, minDistanceMeters) {
    for (let existingPoint of existingPoints) {
        let dist = turf.distance(
            turf.point([newPoint.lng, newPoint.lat]),
            turf.point([existingPoint.lng, existingPoint.lat]),
            { units: 'meters' }
        );

        if (dist < minDistanceMeters) {
            return true; // Trop proche d'un point existant
        }
    }
    return false; // Distance suffisante
}



//** Fonction principale */

function generateIntersections() {
    if (!polygon) {
        alert("Veuillez d'abord dessiner un polygone.");
        return;
    }
    if (typeof map === "undefined" || !map) {
        console.error("⚠️ La carte 'map' n'est pas disponible !");
        return;
    }

    // --- Supprimer les anciennes couches ---
    if (intersectionLayer) map.removeLayer(intersectionLayer);
    if (gridLayer) map.removeLayer(gridLayer);

    // ---- Creation de la nouvelle couche --- 
    intersectionLayer = L.layerGroup().addTo(map);
    gridLayer = L.layerGroup().addTo(map);
    lines = [];
    addedPoints = [];    
    intersectionCount = 0;
    console.log("Couches ajoutées à la carte");

    // --- Rotation du polygone pour aligner horizontalement ---
    let polygonCoords = polygon.getLatLngs()[0]; 
    let angle = manualRotation* Math.PI / 180 + getMainOrientation(polygon);  // conversion en radians //manuel
    let boundsGlobal = polygon.getBounds();
    let center = boundsGlobal.getCenter(); // centre en tant que L.LatLng
    let bufferDemiLocal = rotatePolygon(polygonCoords, center, angle);

    // --- Affichage du polygone tourné ---
    if (typeof polygonOriginalLayer !== "undefined") {
        map.removeLayer(polygonOriginalLayer);
    }
    polygonOriginalLayer = L.polygon(bufferDemiLocal, { color: 'blue', weight: 2, dashArray: '5,5' }).addTo(map);

    // --- Calcul de la bounding box de la grille basée sur les points tournés ---
    let boundsLocal = L.latLngBounds(bufferDemiLocal);
    let southWest = boundsLocal.getSouthWest();
    let northEast = boundsLocal.getNorthEast();

    // --- Calcul du pas en degrés à partir du centre ---
    const oneDegreeLatMeters = 111320;  
    const oneDegreeLngMeters = 111320 * Math.cos(center.lat * Math.PI / 180);
    let cellSizeLatDeg = cellSizeMeters / oneDegreeLatMeters;
    let cellSizeLngDeg = cellSizeMeters / oneDegreeLngMeters;

    console.log("Cellule en degrés : lat:", cellSizeLatDeg, "lng:", cellSizeLngDeg);

    // --- Création des valeurs de grille en utilisant ces pas ---
    let latValues = [];
    let lngValues = [];
    for (let lat = southWest.lat; lat <= northEast.lat; lat += cellSizeLatDeg) {
        latValues.push(lat);
    }
    for (let lng = southWest.lng; lng <= northEast.lng; lng += cellSizeLngDeg) {
        lngValues.push(lng);
    }

    // --- Tracé des lignes horizontales ---
    latValues.forEach(lat => {
        let start = L.latLng(lat, southWest.lng);
        let end = L.latLng(lat, northEast.lng);
        let line = L.polyline([start, end], { color: 'black', weight: 1 });
        let rotatedLine = rotateLine(line, angle, center);
        rotatedLine.addTo(gridLayer);
        console.log("Ligne horizontale ajoutée", rotatedLine);
        lines.push(rotatedLine);
        findIntersections(rotatedLine, bufferDemiLayer, "red");
        findIntersections(rotatedLine, bufferFondLayer, "blue");
    });

    // --- Tracé des lignes verticales ---
    lngValues.forEach(lng => {
        let start = L.latLng(southWest.lat, lng);
        let end = L.latLng(northEast.lat, lng);
        let line = L.polyline([start, end], { color: 'black', weight: 1 });
        let rotatedLine = rotateLine(line, angle, center);
        rotatedLine.addTo(gridLayer);
        console.log("Ligne verticale ajoutée", rotatedLine);
        lines.push(rotatedLine);
        findIntersections(rotatedLine, bufferDemiLayer, "red");
        findIntersections(rotatedLine, bufferFondLayer, "blue");
    });

    calculateLineIntersections("green");
    document.getElementById("infoBubble").innerHTML = "Nombre de point de mesure : " + intersectionCount;
}



//** Fonctions d'intersection */

// --- intersections entre une ligne et un polygon ---
function findIntersections(line, ligneDeNiveau, color) {
    let latlngs = line.getLatLngs();
    let lineGeoJSON = turf.lineString(latlngs.map(latlng => [latlng.lng, latlng.lat]));
    if (!ligneDeNiveau) {
        console.error("⚠️ Le bufferLayer est introuvable.");
        return;
    }
    let bufferGeoJSON = ligneDeNiveau.toGeoJSON();
    let intersections = turf.lineIntersect(lineGeoJSON, bufferGeoJSON);
    intersections.features.forEach(function (point) {
        let latlng = L.latLng(point.geometry.coordinates[1], point.geometry.coordinates[0]);
        if (!isTooClose(latlng, addedPoints, minDistanceMeters)){
            L.circleMarker(latlng, { color: color, radius: 5 }).addTo(intersectionLayer);
            let mesureLocation = {
                lng: latlng.lng,
                lat: latlng.lat,
                color: color,}
            addedPoints.push(mesureLocation);
            intersectionCount++;
        }

    });
}

// --- Intersections entre les lignes de la grille qui sont à l'interieur du polygon
function calculateLineIntersections(color) {
    if (!bufferFondLayer) {
        console.error("⚠️ Le bufferLayer est introuvable.");
        return;
    }
    let bufferGeoJSON = bufferFondLayer.toGeoJSON();
    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            let line1 = lines[i];
            let line2 = lines[j];
            let intersection = getLineIntersection(line1, line2);
            if (intersection && turf.booleanPointInPolygon(turf.point([intersection.lng, intersection.lat]), bufferGeoJSON)) {
                if (!isTooClose(intersection, addedPoints, minDistanceMeters)) {
                    L.circleMarker(intersection, { color: color, radius: 5 }).addTo(intersectionLayer);
                    let mesureLocation = {
                        lng: intersection.lng,
                        lat: intersection.lat,
                        color: color,}
                    addedPoints.push(mesureLocation);
                    intersectionCount++;}
            }
        }
    }
}
function getLineIntersection(line1, line2) {
    let latlngs1 = line1.getLatLngs();
    let latlngs2 = line2.getLatLngs();
    let line1GeoJSON = turf.lineString(latlngs1.map(latlng => [latlng.lng, latlng.lat]));
    let line2GeoJSON = turf.lineString(latlngs2.map(latlng => [latlng.lng, latlng.lat]));
    let intersection = turf.lineIntersect(line1GeoJSON, line2GeoJSON);
    if (intersection.features.length > 0) {
        var point = intersection.features[0].geometry.coordinates;
        return L.latLng(point[1], point[0]);
        
    }
    return null;
}



//** Pour charger le module */

function initIntersections() {
    console.log("📌 Initialisation du module Intersections...");
    console.log("✅ Module Intersections initialisé.");
}