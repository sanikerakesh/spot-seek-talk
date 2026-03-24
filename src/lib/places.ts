export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  category: PlaceCategory;
  address?: string;
  rating?: number;
  imageUrl?: string;
  isFavorite?: boolean;
}

export type PlaceCategory = "temple" | "museum" | "park" | "monument" | "viewpoint" | "gallery" | "attraction" | "other";

export const CATEGORY_CONFIG: Record<PlaceCategory, { label: string; emoji: string }> = {
  temple: { label: "Temples", emoji: "🛕" },
  museum: { label: "Museums", emoji: "🏛️" },
  park: { label: "Parks", emoji: "🌳" },
  monument: { label: "Monuments", emoji: "🗿" },
  viewpoint: { label: "Viewpoints", emoji: "👁️" },
  gallery: { label: "Galleries", emoji: "🖼️" },
  attraction: { label: "Attractions", emoji: "⭐" },
  other: { label: "Other", emoji: "📍" },
};

function categorize(tags: any): PlaceCategory {
  if (tags.amenity === "place_of_worship") return "temple";
  if (tags.tourism === "museum") return "museum";
  if (tags.leisure === "park" || tags.leisure === "garden") return "park";
  if (tags.historic === "monument" || tags.historic === "memorial") return "monument";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.tourism === "gallery" || tags.tourism === "artwork") return "gallery";
  if (tags.tourism === "attraction") return "attraction";
  return "other";
}

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function queryOverpass(query: string): Promise<any> {
  for (const url of OVERPASS_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (response.ok) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          continue; // Got HTML error page, try next server
        }
      }
    } catch {
      continue;
    }
  }
  throw new Error("All Overpass servers are busy. Please try again.");
}

export async function fetchPlaceImage(name: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.thumbnail?.source || data.originalimage?.source || undefined;
  } catch {
    return undefined;
  }
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radius: number = 5000
): Promise<Place[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint|artwork|gallery"](around:${radius},${lat},${lon});
      node["historic"](around:${radius},${lat},${lon});
      node["amenity"~"place_of_worship"](around:${radius},${lat},${lon});
      node["leisure"~"park|garden"](around:${radius},${lat},${lon});
    );
    out body 30;
  `;

  const data = await queryOverpass(query);

  const places: Place[] = data.elements
    .filter((el: any) => el.tags?.name)
    .map((el: any) => ({
      id: String(el.id),
      name: el.tags.name,
      lat: el.lat,
      lon: el.lon,
      type: el.tags.tourism || el.tags.historic || el.tags.amenity || el.tags.leisure || "attraction",
      category: categorize(el.tags),
      address: [el.tags["addr:street"], el.tags["addr:city"]].filter(Boolean).join(", ") || undefined,
      rating: el.tags.stars ? parseFloat(el.tags.stars) : Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    }));

  // Fetch images for top places in parallel (first 10)
  const imagePromises = places.slice(0, 10).map(async (place) => {
    place.imageUrl = await fetchPlaceImage(place.name);
    return place;
  });
  await Promise.allSettled(imagePromises);

  return places;
}

export async function searchPlaceByName(
  name: string,
  lat: number,
  lon: number
): Promise<Place | null> {
  // Sanitize name for Overpass regex
  const sanitized = name.replace(/[^a-zA-Z0-9\s]/g, ".").trim();
  const query = `
    [out:json][timeout:10];
    (
      node["name"~"${sanitized}",i](around:20000,${lat},${lon});
      way["name"~"${sanitized}",i](around:20000,${lat},${lon});
    );
    out center 1;
  `;

  try {
    const data = await queryOverpass(query);
    const el = data.elements?.[0];
    if (!el) return null;

    const placeLat = el.lat || el.center?.lat;
    const placeLon = el.lon || el.center?.lon;
    if (!placeLat || !placeLon) return null;

    const imageUrl = await fetchPlaceImage(el.tags?.name || name);

    return {
      id: String(el.id),
      name: el.tags?.name || name,
      lat: placeLat,
      lon: placeLon,
      type: el.tags?.tourism || el.tags?.historic || el.tags?.amenity || "attraction",
      category: el.tags ? categorize(el.tags) : "attraction",
      address: [el.tags?.["addr:street"], el.tags?.["addr:city"]].filter(Boolean).join(", ") || undefined,
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      imageUrl,
    };
  } catch {
    return null;
  }
}

export async function fetchRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<[number, number][]> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords) return [];
    // OSRM returns [lon, lat], Leaflet wants [lat, lon]
    return coords.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
  } catch {
    return [];
  }
}

// Favorites persistence
const FAVORITES_KEY = "tourguide_favorites";

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleFavorite(placeId: string): string[] {
  const favs = getFavorites();
  const idx = favs.indexOf(placeId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(placeId);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return favs;
}
