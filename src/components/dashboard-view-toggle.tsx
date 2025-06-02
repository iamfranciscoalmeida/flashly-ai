"use client";

import { useState } from "react";
import { Toggle } from "./ui/toggle";
import { Separator } from "./ui/separator";
import { Columns, Maximize2 } from "lucide-react";

interface DashboardViewToggleProps {
  view: "split" | "full";
  onViewChange: (view: "split" | "full") => void;
}

export default function DashboardViewToggle({
  view,
  onViewChange,
}: DashboardViewToggleProps) {
  return (
    <div className="flex items-center bg-muted/30 rounded-md p-1">
      <Toggle
        pressed={view === "split"}
        onPressedChange={() => onViewChange("split")}
        aria-label="Split view"
        className="flex gap-2 items-center data-[state=on]:bg-white data-[state=on]:text-primary"
      >
        <Columns className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Split</span>
      </Toggle>
      <Separator orientation="vertical" className="mx-1 h-4" />
      <Toggle
        pressed={view === "full"}
        onPressedChange={() => onViewChange("full")}
        aria-label="Full view"
        className="flex gap-2 items-center data-[state=on]:bg-white data-[state=on]:text-primary"
      >
        <Maximize2 className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Full</span>
      </Toggle>
    </div>
  );
}
