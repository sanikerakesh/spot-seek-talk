import { Place } from "@/lib/places";
import { MapPin, Star, Heart } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

interface PlaceCardProps {
  place: Place;
  isSelected: boolean;
  isFavorite: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
}

const typeLabels: Record<string, string> = {
  attraction: "🏛️ Attraction",
  museum: "🏛️ Museum",
  viewpoint: "👁️ Viewpoint",
  artwork: "🎨 Artwork",
  gallery: "🖼️ Gallery",
  place_of_worship: "🛕 Temple/Shrine",
  park: "🌳 Park",
  garden: "🌺 Garden",
  monument: "🗿 Monument",
  castle: "🏰 Castle",
  ruins: "🏚️ Ruins",
  memorial: "🕊️ Memorial",
};

const PlaceCard = React.forwardRef<HTMLButtonElement, PlaceCardProps>(
  ({ place, isSelected, isFavorite, onClick, onToggleFavorite }, ref) => {
    const label = typeLabels[place.type] || `📍 ${place.type}`;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <button
          ref={ref}
          onClick={onClick}
          className={`w-full text-left rounded-lg border transition-all duration-200 overflow-hidden ${
            isSelected
              ? "bg-primary/10 border-primary shadow-[var(--shadow-glow)]"
              : "bg-card border-border hover:border-primary/40"
          }`}
        >
          {/* Image */}
          {place.imageUrl && (
            <div className="w-full h-24 overflow-hidden">
              <img
                src={place.imageUrl}
                alt={place.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-semibold text-sm text-foreground truncate">
                  {place.name}
                </h4>
                <span className="text-xs text-muted-foreground">{label}</span>
                {place.address && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {place.address}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {place.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-accent font-medium">
                    <Star className="w-3 h-3 fill-accent" />
                    {place.rating}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                  className="p-0.5 hover:scale-110 transition-transform"
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    className={`w-3.5 h-3.5 transition-colors ${
                      isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </button>
      </motion.div>
    );
  }
);

PlaceCard.displayName = "PlaceCard";
export default PlaceCard;
