import { useState, useCallback, useEffect, useMemo } from "react";
import { Compass, Loader2, MapPin, MessageCircle, X, Navigation, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  fetchNearbyPlaces,
  searchPlaceByName,
  fetchRoute,
  getFavorites,
  toggleFavorite,
  Place,
  PlaceCategory,
} from "@/lib/places";
import MapView from "@/components/MapView";
import PlaceCard from "@/components/PlaceCard";
import AIChatPanel from "@/components/AIChatPanel";
import CategoryFilter from "@/components/CategoryFilter";

export default function Index() {
  const { latitude, longitude, loading: locLoading, error: locError } = useGeolocation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all" | "favorites">("all");
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const exploreNearby = useCallback(async () => {
    if (!latitude || !longitude) return;
    setLoadingPlaces(true);
    setRouteCoords([]);
    try {
      const results = await fetchNearbyPlaces(latitude, longitude);
      setPlaces(results);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch nearby places. Servers may be busy — try again.");
    } finally {
      setLoadingPlaces(false);
    }
  }, [latitude, longitude]);

  // Auto-explore on location load
  useEffect(() => {
    if (latitude && longitude && !locLoading) {
      exploreNearby();
    }
  }, [latitude, longitude, locLoading, exploreNearby]);

  const filteredPlaces = useMemo(() => {
    if (categoryFilter === "all") return places;
    if (categoryFilter === "favorites") return places.filter((p) => favorites.includes(p.id));
    return places.filter((p) => p.category === categoryFilter);
  }, [places, categoryFilter, favorites]);

  const handleAIResponse = useCallback(
    async (placeNames: string[]) => {
      setIsProcessingAI(true);
      setRouteCoords([]);
      const found: Place[] = [];

      for (const name of placeNames) {
        const place = await searchPlaceByName(name, latitude, longitude);
        if (place) found.push(place);
      }

      if (found.length > 0) {
        setPlaces(found);
        setSelectedPlaceId(found[0].id);
        setCategoryFilter("all");
      }
      setIsProcessingAI(false);
    },
    [latitude, longitude]
  );

  const handleToggleFavorite = useCallback((placeId: string) => {
    const newFavs = toggleFavorite(placeId);
    setFavorites([...newFavs]);
  }, []);

  const handleGetDirections = useCallback(
    async (place: Place) => {
      if (!latitude || !longitude) return;
      setLoadingRoute(true);
      try {
        const coords = await fetchRoute(latitude, longitude, place.lat, place.lon);
        setRouteCoords(coords);
        setSelectedPlaceId(place.id);
      } catch {
        // silently fail
      } finally {
        setLoadingRoute(false);
      }
    },
    [latitude, longitude]
  );

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedPlaceId),
    [places, selectedPlaceId]
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header
        className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--gradient-card)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🌍</span>
          <h1 className="font-display font-bold text-lg text-foreground">Tour Guide AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exploreNearby}
            disabled={loadingPlaces || locLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-all hover:brightness-110"
          >
            {loadingPlaces ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Compass className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Explore</span>
          </button>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              chatOpen
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:border-primary/40 border border-border"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </header>

      {/* Category Filter */}
      <div className="shrink-0 border-b border-border" style={{ background: "var(--gradient-card)" }}>
        <CategoryFilter
          selected={categoryFilter}
          onChange={setCategoryFilter}
          favoritesCount={favorites.length}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Map */}
        <div className="flex-1 min-w-0 relative">
          {locLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground text-sm">Detecting your location...</p>
              </div>
            </div>
          ) : (
            <MapView
              latitude={latitude}
              longitude={longitude}
              places={filteredPlaces}
              selectedPlaceId={selectedPlaceId}
              routeCoords={routeCoords}
              onPlaceSelect={(p) => setSelectedPlaceId(p.id)}
            />
          )}

          {/* Location error toast */}
          {locError && (
            <div className="absolute top-3 left-3 right-3 md:right-auto md:max-w-sm bg-card border border-accent/30 rounded-lg px-3 py-2 text-xs text-accent flex items-center gap-2 z-[1000]">
              <MapPin className="w-3 h-3 shrink-0" />
              {locError} — Using default location.
            </div>
          )}

          {/* Directions button for selected place */}
          {selectedPlace && (
            <div className="absolute bottom-3 left-3 z-[1000]">
              <button
                onClick={() => handleGetDirections(selectedPlace)}
                disabled={loadingRoute}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-lg transition-all hover:brightness-110 disabled:opacity-50"
              >
                {loadingRoute ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                Directions to {selectedPlace.name.slice(0, 20)}
                {selectedPlace.name.length > 20 ? "…" : ""}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: Places list (desktop) */}
        <div className="hidden md:flex w-72 flex-col border-l border-border bg-card/50">
          <div className="px-3 py-2 border-b border-border">
            <h2 className="font-display font-semibold text-sm text-foreground">
              {categoryFilter === "favorites"
                ? `Saved Places (${filteredPlaces.length})`
                : `Nearby Places (${filteredPlaces.length})`}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isSelected={place.id === selectedPlaceId}
                isFavorite={favorites.includes(place.id)}
                onClick={() => setSelectedPlaceId(place.id)}
                onToggleFavorite={() => handleToggleFavorite(place.id)}
              />
            ))}
            {filteredPlaces.length === 0 && !loadingPlaces && (
              <p className="text-muted-foreground text-xs text-center py-6">
                {categoryFilter === "favorites"
                  ? "No saved places yet. Tap the heart on any place to save it."
                  : "No places found in this category. Try exploring nearby."}
              </p>
            )}
          </div>
        </div>

        {/* Mobile bottom sheet for places */}
        {!chatOpen && filteredPlaces.length > 0 && (
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-[1000]">
            <div className="bg-card/95 backdrop-blur border-t border-border rounded-t-xl max-h-[40vh] overflow-y-auto p-2 space-y-2">
              {filteredPlaces.slice(0, 6).map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  isSelected={place.id === selectedPlaceId}
                  isFavorite={favorites.includes(place.id)}
                  onClick={() => setSelectedPlaceId(place.id)}
                  onToggleFavorite={() => handleToggleFavorite(place.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute md:relative right-0 top-0 bottom-0 w-full md:w-80 bg-card border-l border-border z-[1001] flex flex-col"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <h2 className="font-display font-semibold text-sm text-foreground">AI Guide 🤖</h2>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <AIChatPanel onAIResponse={handleAIResponse} isProcessing={isProcessingAI} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
