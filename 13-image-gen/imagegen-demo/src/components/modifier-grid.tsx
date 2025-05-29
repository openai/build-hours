"use client"

/*
 * Grid of modifier option cards. The list below MUST stay in sync with the
 * keys defined in `src/app/api/generate/route.ts` (modifierPrompts object).
 */

import OptionCard from "./option-card"

// Lucide icons used to visually represent each modifier.
import {
  Grid,
  Hand,
  ToyBrick,
  Sparkle,
  Coffee,
  Award,
  CloudSun,
  Cpu,
  Bot,
  Clapperboard,
  LucideIcon

} from "lucide-react"

interface ModifierGridProps {
  selectedModifiers: string[]
  onToggle: (modifier: string) => void
  /**
   * Optional maximum number of selections. Omit or set to a non-positive value
   * to allow unlimited selections.
   */
  maxSelections?: number
}

type Modifier = {
  id: string
  label: string
  icon: LucideIcon
}

// Keep this list alphabetically sorted by `id` for easier maintenance.
const modifiers: Modifier[] = [
  { id: "comic-panel", label: "Comic Panel", icon: Grid },
  { id: "action-figure", label: "Action Figure", icon: Hand },
  { id: "ghibli-style", label: "Ghibli Style", icon: CloudSun },
  { id: "lego-minifigure-style", label: "Minifigure", icon: ToyBrick },
  { id: "paperback", label: "Paperback", icon: Sparkle },
  { id: "knitted-cozy-scene", label: "Knitted Cozy Scene", icon: Coffee },
  { id: "mission-patch", label: "Mission Patch", icon: Award },
  { id: "japanese-anime-movie-poster", label: "Japanese Anime Movie Poster", icon: Clapperboard },
  { id: "80s-cave", label: "80s Tech Cave", icon: Cpu },
]

export default function ModifierGrid({ selectedModifiers, onToggle, maxSelections }: ModifierGridProps) {
  const unlimited = !maxSelections || maxSelections <= 0 || maxSelections === Infinity
  const isMaxSelected = unlimited ? false : selectedModifiers.length >= maxSelections!

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {modifiers.map((modifier) => {
        const isSelected = selectedModifiers.includes(modifier.id)
        const isDisabled = !isSelected && isMaxSelected

        return (
          <OptionCard
            key={modifier.id}
            id={modifier.id}
            label={modifier.label}
            icon={modifier.icon}
            isSelected={isSelected}
            isDisabled={isDisabled}
            onClick={() => onToggle(modifier.id)}
            tooltipText={isDisabled ? "Maximum selections reached" : undefined}
          />
        )
      })}
    </div>
  )
}
