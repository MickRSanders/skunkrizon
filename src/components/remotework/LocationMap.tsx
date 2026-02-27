import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, TrendingUp, Send, X, Building2, AlertTriangle } from "lucide-react";

export interface LocationPoint {
  city: string;
  country: string;
  lat: number;
  lng: number;
  activeWorkers: number;
  availableAssignments: number;
  riskLevel: "low" | "medium" | "high";
  type: "origin" | "destination" | "both";
}

// Sample popular remote work locations with real coordinates
export const SAMPLE_LOCATIONS: LocationPoint[] = [
  { city: "London", country: "United Kingdom", lat: 51.5, lng: -0.12, activeWorkers: 14, availableAssignments: 3, riskLevel: "low", type: "both" },
  { city: "Berlin", country: "Germany", lat: 52.52, lng: 13.4, activeWorkers: 9, availableAssignments: 5, riskLevel: "low", type: "destination" },
  { city: "Lisbon", country: "Portugal", lat: 38.72, lng: -9.14, activeWorkers: 11, availableAssignments: 2, riskLevel: "low", type: "destination" },
  { city: "Dubai", country: "UAE", lat: 25.2, lng: 55.27, activeWorkers: 7, availableAssignments: 1, riskLevel: "medium", type: "destination" },
  { city: "Singapore", country: "Singapore", lat: 1.35, lng: 103.82, activeWorkers: 8, availableAssignments: 4, riskLevel: "low", type: "both" },
  { city: "New York", country: "United States", lat: 40.71, lng: -74.0, activeWorkers: 18, availableAssignments: 6, riskLevel: "low", type: "origin" },
  { city: "San Francisco", country: "United States", lat: 37.77, lng: -122.42, activeWorkers: 12, availableAssignments: 2, riskLevel: "low", type: "origin" },
  { city: "Amsterdam", country: "Netherlands", lat: 52.37, lng: 4.9, activeWorkers: 6, availableAssignments: 3, riskLevel: "low", type: "destination" },
  { city: "Barcelona", country: "Spain", lat: 41.39, lng: 2.17, activeWorkers: 10, availableAssignments: 4, riskLevel: "medium", type: "destination" },
  { city: "Tokyo", country: "Japan", lat: 35.68, lng: 139.69, activeWorkers: 5, availableAssignments: 1, riskLevel: "medium", type: "both" },
  { city: "Sydney", country: "Australia", lat: -33.87, lng: 151.21, activeWorkers: 4, availableAssignments: 0, riskLevel: "low", type: "origin" },
  { city: "Toronto", country: "Canada", lat: 43.65, lng: -79.38, activeWorkers: 7, availableAssignments: 2, riskLevel: "low", type: "origin" },
  { city: "Paris", country: "France", lat: 48.86, lng: 2.35, activeWorkers: 8, availableAssignments: 3, riskLevel: "medium", type: "destination" },
  { city: "Mumbai", country: "India", lat: 19.08, lng: 72.88, activeWorkers: 6, availableAssignments: 0, riskLevel: "high", type: "destination" },
  { city: "Zürich", country: "Switzerland", lat: 47.37, lng: 8.54, activeWorkers: 5, availableAssignments: 2, riskLevel: "low", type: "both" },
  { city: "São Paulo", country: "Brazil", lat: -23.55, lng: -46.63, activeWorkers: 3, availableAssignments: 0, riskLevel: "high", type: "destination" },
  { city: "Cape Town", country: "South Africa", lat: -33.93, lng: 18.42, activeWorkers: 2, availableAssignments: 1, riskLevel: "medium", type: "destination" },
  { city: "Bangkok", country: "Thailand", lat: 13.76, lng: 100.5, activeWorkers: 4, availableAssignments: 0, riskLevel: "high", type: "destination" },
];

function project(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN / Math.PI) * (height / 2) * 0.8;
  return [x, y];
}

const riskDotColors: Record<string, string> = {
  low: "hsl(var(--accent))",
  medium: "hsl(45, 93%, 47%)",
  high: "hsl(0, 84%, 60%)",
};

const riskLabels: Record<string, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

interface LocationMapProps {
  onRequestFromLocation?: (location: LocationPoint) => void;
}

export default function LocationMap({ onRequestFromLocation }: LocationMapProps) {
  const [hovered, setHovered] = useState<LocationPoint | null>(null);
  const [selected, setSelected] = useState<LocationPoint | null>(null);
  const width = 900;
  const height = 460;

  const totalWorkers = useMemo(() => SAMPLE_LOCATIONS.reduce((s, l) => s + l.activeWorkers, 0), []);
  const totalAssignments = useMemo(() => SAMPLE_LOCATIONS.reduce((s, l) => s + l.availableAssignments, 0), []);

  const handleDotClick = (loc: LocationPoint) => {
    setSelected(selected?.city === loc.city ? null : loc);
  };

  const handleRequestClick = () => {
    if (selected && onRequestFromLocation) {
      onRequestFromLocation(selected);
      setSelected(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" /> Remote Work Locations
          </CardTitle>
          <div className="flex items-center gap-5 text-xs">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{totalWorkers}</span>
              <span className="text-muted-foreground">workers</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{totalAssignments}</span>
              <span className="text-muted-foreground">open assignments</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{SAMPLE_LOCATIONS.length}</span>
              <span className="text-muted-foreground">locations</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {/* SVG Map */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: 280 }}>
          <rect width={width} height={height} className="fill-muted/30" />
          <WorldOutline width={width} height={height} />
          <Arcs width={width} height={height} selected={selected} />

          {SAMPLE_LOCATIONS.map((loc) => {
            const [x, y] = project(loc.lat, loc.lng, width, height);
            const r = Math.max(5, Math.min(12, loc.activeWorkers * 0.6));
            const isHovered = hovered?.city === loc.city;
            const isSelected = selected?.city === loc.city;
            const hasAssignments = loc.availableAssignments > 0;

            return (
              <g
                key={loc.city}
                onMouseEnter={() => setHovered(loc)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleDotClick(loc)}
                className="cursor-pointer"
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 8} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4,2">
                    <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Pulse ring */}
                <circle cx={x} cy={y} r={r + 4} fill={riskDotColors[loc.riskLevel]} opacity={isHovered || isSelected ? 0.3 : 0.1}>
                  {!isHovered && !isSelected && (
                    <animate attributeName="r" from={r + 2} to={r + 8} dur="2.5s" repeatCount="indefinite" />
                  )}
                  <animate attributeName="opacity" from={isHovered || isSelected ? 0.3 : 0.15} to="0" dur="2.5s" repeatCount="indefinite" />
                </circle>
                {/* Main dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered || isSelected ? r + 2 : r}
                  fill={riskDotColors[loc.riskLevel]}
                  stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--background))"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={0.9}
                  style={{ transition: "all 0.15s ease" }}
                />
                {/* Available assignments badge */}
                {hasAssignments && (
                  <>
                    <circle cx={x + r} cy={y - r} r={6} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1} />
                    <text x={x + r} y={y - r + 3.5} textAnchor="middle" fontSize={7} fontWeight={700} fill="hsl(var(--primary-foreground))">
                      {loc.availableAssignments}
                    </text>
                  </>
                )}
                {/* Tooltip on hover */}
                {(isHovered || isSelected) && (
                  <>
                    <rect
                      x={x - 70}
                      y={y - r - 42}
                      width={140}
                      height={34}
                      rx={6}
                      fill="hsl(var(--popover))"
                      stroke="hsl(var(--border))"
                      strokeWidth={0.8}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                    />
                    <text x={x} y={y - r - 27} textAnchor="middle" fontSize={10} fontWeight={600} fill="hsl(var(--foreground))">
                      {loc.city}, {loc.country}
                    </text>
                    <text x={x} y={y - r - 15} textAnchor="middle" fontSize={8} fill="hsl(var(--muted-foreground))">
                      {loc.activeWorkers} workers · {loc.availableAssignments} open{loc.availableAssignments !== 1 ? "" : ""} · {riskLabels[loc.riskLevel]}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected location detail panel */}
        {selected && (
          <div className="absolute bottom-14 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 bg-popover border border-border rounded-lg shadow-lg p-4 space-y-3 z-10">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-sm">{selected.city}, {selected.country}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.activeWorkers} active workers</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelected(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <Badge
                variant="outline"
                className="gap-1"
                style={{ borderColor: riskDotColors[selected.riskLevel], color: riskDotColors[selected.riskLevel] }}
              >
                <AlertTriangle className="w-3 h-3" />
                {riskLabels[selected.riskLevel]}
              </Badge>
              {selected.availableAssignments > 0 ? (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="w-3 h-3" />
                  {selected.availableAssignments} open assignment{selected.availableAssignments !== 1 ? "s" : ""}
                </Badge>
              ) : (
                <span className="text-muted-foreground italic">No open assignments</span>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleRequestClick}>
                <Send className="w-3.5 h-3.5" />
                Request This Location
              </Button>
            </div>
            {selected.availableAssignments === 0 && (
              <p className="text-[10px] text-muted-foreground leading-tight">
                No open assignments here yet — you can still submit a request for this location.
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 px-5 py-3 border-t border-border flex-wrap">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: riskDotColors.low }} /> Low Risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: riskDotColors.medium }} /> Medium Risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: riskDotColors.high }} /> High Risk
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary flex items-center justify-center text-[6px] text-primary-foreground font-bold">n</span>
              Open assignments
            </span>
          </div>
          <p className="ml-auto text-[10px] text-muted-foreground">Click a location to request an assignment</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorldOutline({ width, height }: { width: number; height: number }) {
  const continentPoints = [
    { lat: 60, lng: -130 }, { lat: 55, lng: -120 }, { lat: 50, lng: -100 }, { lat: 45, lng: -90 },
    { lat: 40, lng: -80 }, { lat: 35, lng: -85 }, { lat: 30, lng: -90 }, { lat: 25, lng: -100 },
    { lat: 20, lng: -105 }, { lat: 48, lng: -55 }, { lat: 45, lng: -65 }, { lat: 42, lng: -72 },
    { lat: 10, lng: -75 }, { lat: 0, lng: -50 }, { lat: -10, lng: -40 }, { lat: -15, lng: -48 },
    { lat: -23, lng: -43 }, { lat: -33, lng: -70 }, { lat: -40, lng: -65 }, { lat: -50, lng: -70 },
    { lat: 60, lng: 10 }, { lat: 55, lng: 15 }, { lat: 50, lng: 5 }, { lat: 48, lng: 10 },
    { lat: 45, lng: 15 }, { lat: 40, lng: -5 }, { lat: 38, lng: 25 }, { lat: 55, lng: 25 },
    { lat: 65, lng: 25 }, { lat: 60, lng: 30 },
    { lat: 35, lng: 10 }, { lat: 30, lng: 30 }, { lat: 15, lng: 40 }, { lat: 5, lng: 35 },
    { lat: 0, lng: 30 }, { lat: -10, lng: 35 }, { lat: -25, lng: 30 }, { lat: -33, lng: 25 },
    { lat: 5, lng: -5 }, { lat: 15, lng: -15 },
    { lat: 60, lng: 60 }, { lat: 55, lng: 80 }, { lat: 50, lng: 100 }, { lat: 45, lng: 90 },
    { lat: 40, lng: 75 }, { lat: 30, lng: 80 }, { lat: 25, lng: 90 }, { lat: 20, lng: 100 },
    { lat: 35, lng: 105 }, { lat: 40, lng: 120 }, { lat: 35, lng: 130 }, { lat: 45, lng: 140 },
    { lat: 10, lng: 105 }, { lat: 5, lng: 115 },
    { lat: -15, lng: 130 }, { lat: -20, lng: 140 }, { lat: -25, lng: 150 }, { lat: -35, lng: 145 },
    { lat: -30, lng: 115 }, { lat: -20, lng: 120 },
  ];

  return (
    <>
      {continentPoints.map((p, i) => {
        const [x, y] = project(p.lat, p.lng, width, height);
        return <circle key={i} cx={x} cy={y} r={1.2} className="fill-muted-foreground/15" />;
      })}
    </>
  );
}

function Arcs({ width, height, selected }: { width: number; height: number; selected: LocationPoint | null }) {
  const origins = SAMPLE_LOCATIONS.filter((l) => l.type === "origin" || l.type === "both");
  const destinations = SAMPLE_LOCATIONS.filter((l) => l.type === "destination" || l.type === "both");

  const arcs: [LocationPoint, LocationPoint][] = [];
  
  if (selected) {
    // Show arcs from all origins to the selected location
    origins.forEach((o) => {
      if (o.city !== selected.city) arcs.push([o, selected]);
    });
  } else {
    origins.slice(0, 4).forEach((o) => {
      destinations.slice(0, 3).forEach((d) => {
        if (o.city !== d.city) arcs.push([o, d]);
      });
    });
  }

  return (
    <>
      {arcs.slice(0, 12).map(([from, to], i) => {
        const [x1, y1] = project(from.lat, from.lng, width, height);
        const [x2, y2] = project(to.lat, to.lng, width, height);
        const midX = (x1 + x2) / 2;
        const midY = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.12;
        return (
          <path
            key={i}
            d={`M${x1},${y1} Q${midX},${midY} ${x2},${y2}`}
            fill="none"
            stroke={selected ? "hsl(var(--primary))" : "hsl(var(--accent))"}
            strokeWidth={selected ? 1 : 0.6}
            opacity={selected ? 0.3 : 0.15}
            strokeDasharray="3,3"
          />
        );
      })}
    </>
  );
}
