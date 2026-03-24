import { PlaceCategory, CATEGORY_CONFIG } from "@/lib/places";

interface CategoryFilterProps {
  selected: PlaceCategory | "all" | "favorites";
  onChange: (cat: PlaceCategory | "all" | "favorites") => void;
  favoritesCount: number;
}

const categories: (PlaceCategory | "all" | "favorites")[] = [
  "all",
  "favorites",
  "temple",
  "museum",
  "park",
  "monument",
  "viewpoint",
  "gallery",
  "attraction",
];

export default function CategoryFilter({ selected, onChange, favoritesCount }: CategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
      {categories.map((cat) => {
        const isActive = selected === cat;
        let label: string;
        let emoji: string;

        if (cat === "all") {
          label = "All";
          emoji = "🗺️";
        } else if (cat === "favorites") {
          label = `Saved${favoritesCount > 0 ? ` (${favoritesCount})` : ""}`;
          emoji = "❤️";
        } else {
          const config = CATEGORY_CONFIG[cat];
          label = config.label;
          emoji = config.emoji;
        }

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <span>{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
