import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Place } from "@/lib/places";

// Fix default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const userIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;background:hsl(174,72%,46%);border:3px solid hsl(210,40%,96%);border-radius:50%;box-shadow:0 0 12px hsl(174,72%,46%,0.6);"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const placeIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;background:hsl(36,95%,60%);border:2px solid hsl(210,40%,96%);border-radius:50%;box-shadow:0 0 8px hsl(36,95%,60%,0.5);"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const highlightIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;background:hsl(174,72%,46%);border:3px solid hsl(36,95%,60%);border-radius:50%;box-shadow:0 0 16px hsl(174,72%,46%,0.8);"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface MapViewProps {
  latitude: number;
  longitude: number;
  places: Place[];
  selectedPlaceId?: string | null;
  routeCoords?: [number, number][];
  onPlaceSelect?: (place: Place) => void;
}

export default function MapView({
  latitude,
  longitude,
  places,
  selectedPlaceId,
  routeCoords,
  onPlaceSelect,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center
  useEffect(() => {
    if (!mapRef.current || !latitude) return;
    mapRef.current.setView([latitude, longitude], 13);
  }, [latitude, longitude]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    // User marker
    L.marker([latitude, longitude], { icon: userIcon })
      .bindPopup("<b>You are here</b>")
      .addTo(markersRef.current);

    // Place markers
    places.forEach((place) => {
      const isSelected = place.id === selectedPlaceId;
      const marker = L.marker([place.lat, place.lon], {
        icon: isSelected ? highlightIcon : placeIcon,
      })
        .bindPopup(
          `<b>${place.name}</b><br/>${place.type}${place.rating ? ` • ⭐ ${place.rating}` : ""}`
        )
        .addTo(markersRef.current!);

      if (isSelected) {
        marker.openPopup();
        mapRef.current?.setView([place.lat, place.lon], 15);
      }

      marker.on("click", () => onPlaceSelect?.(place));
    });
  }, [latitude, longitude, places, selectedPlaceId, onPlaceSelect]);

  // Route line
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old route
    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeCoords && routeCoords.length > 1) {
      routeLayerRef.current = L.polyline(routeCoords, {
        color: "hsl(174, 72%, 46%)",
        weight: 4,
        opacity: 0.8,
        dashArray: "8, 8",
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [routeCoords]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg border border-border overflow-hidden"
      style={{ minHeight: "300px" }}
    />
  );
}
