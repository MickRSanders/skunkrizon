import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, TrendingUp } from "lucide-react";

export interface LocationPoint {
  city: string;
  country: string;
  lat: number;
  lng: number;
  activeWorkers: number;
  riskLevel: "low" | "medium" | "high";
  type: "origin" | "destination" | "both";
}

// Sample popular remote work locations with real coordinates
const SAMPLE_LOCATIONS: LocationPoint[] = [
  { city: "London", country: "United Kingdom", lat: 51.5, lng: -0.12, activeWorkers: 14, riskLevel: "low", type: "both" },
  { city: "Berlin", country: "Germany", lat: 52.52, lng: 13.4, activeWorkers: 9, riskLevel: "low", type: "destination" },
  { city: "Lisbon", country: "Portugal", lat: 38.72, lng: -9.14, activeWorkers: 11, riskLevel: "low", type: "destination" },
  { city: "Dubai", country: "UAE", lat: 25.2, lng: 55.27, activeWorkers: 7, riskLevel: "medium", type: "destination" },
  { city: "Singapore", country: "Singapore", lat: 1.35, lng: 103.82, activeWorkers: 8, riskLevel: "low", type: "both" },
  { city: "New York", country: "United States", lat: 40.71, lng: -74.0, activeWorkers: 18, riskLevel: "low", type: "origin" },
  { city: "San Francisco", country: "United States", lat: 37.77, lng: -122.42, activeWorkers: 12, riskLevel: "low", type: "origin" },
  { city: "Amsterdam", country: "Netherlands", lat: 52.37, lng: 4.9, activeWorkers: 6, riskLevel: "low", type: "destination" },
  { city: "Barcelona", country: "Spain", lat: 41.39, lng: 2.17, activeWorkers: 10, riskLevel: "medium", type: "destination" },
  { city: "Tokyo", country: "Japan", lat: 35.68, lng: 139.69, activeWorkers: 5, riskLevel: "medium", type: "both" },
  { city: "Sydney", country: "Australia", lat: -33.87, lng: 151.21, activeWorkers: 4, riskLevel: "low", type: "origin" },
  { city: "Toronto", country: "Canada", lat: 43.65, lng: -79.38, activeWorkers: 7, riskLevel: "low", type: "origin" },
  { city: "Paris", country: "France", lat: 48.86, lng: 2.35, activeWorkers: 8, riskLevel: "medium", type: "destination" },
  { city: "Mumbai", country: "India", lat: 19.08, lng: 72.88, activeWorkers: 6, riskLevel: "high", type: "destination" },
  { city: "Zürich", country: "Switzerland", lat: 47.37, lng: 8.54, activeWorkers: 5, riskLevel: "low", type: "both" },
  { city: "São Paulo", country: "Brazil", lat: -23.55, lng: -46.63, activeWorkers: 3, riskLevel: "high", type: "destination" },
  { city: "Cape Town", country: "South Africa", lat: -33.93, lng: 18.42, activeWorkers: 2, riskLevel: "medium", type: "destination" },
  { city: "Bangkok", country: "Thailand", lat: 13.76, lng: 100.5, activeWorkers: 4, riskLevel: "high", type: "destination" },
];

// Convert lat/lng to SVG coordinates using Mercator-like projection
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

export default function LocationMap() {
  const [hovered, setHovered] = useState<LocationPoint | null>(null);
  const width = 800;
  const height = 420;

  const totalWorkers = useMemo(() => SAMPLE_LOCATIONS.reduce((s, l) => s + l.activeWorkers, 0), []);
  const topCountries = useMemo(() => {
    const map: Record<string, number> = {};
    SAMPLE_LOCATIONS.forEach((l) => { map[l.country] = (map[l.country] || 0) + l.activeWorkers; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" /> Remote Work Locations
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{totalWorkers}</span>
              <span className="text-muted-foreground">workers</span>
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: 260 }}>
          {/* Background */}
          <rect width={width} height={height} className="fill-muted/30" rx={0} />

          {/* Simplified continent outlines via dots grid for context */}
          <WorldOutline width={width} height={height} />

          {/* Connection arcs from origins to popular destinations */}
          <Arcs width={width} height={height} />

          {/* Location dots */}
          {SAMPLE_LOCATIONS.map((loc) => {
            const [x, y] = project(loc.lat, loc.lng, width, height);
            const r = Math.max(4, Math.min(10, loc.activeWorkers * 0.55));
            const isHovered = hovered?.city === loc.city;
            return (
              <g
                key={loc.city}
                onMouseEnter={() => setHovered(loc)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                {/* Pulse ring */}
                <circle cx={x} cy={y} r={r + 4} fill={riskDotColors[loc.riskLevel]} opacity={isHovered ? 0.25 : 0.1}>
                  {!isHovered && (
                    <animate attributeName="r" from={r + 2} to={r + 8} dur="2.5s" repeatCount="indefinite" />
                  )}
                  <animate attributeName="opacity" from={isHovered ? 0.25 : 0.15} to="0" dur="2.5s" repeatCount="indefinite" />
                </circle>
                {/* Main dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? r + 2 : r}
                  fill={riskDotColors[loc.riskLevel]}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.5}
                  opacity={0.9}
                  style={{ transition: "r 0.15s ease" }}
                />
                {/* Label on hover */}
                {isHovered && (
                  <>
                    <rect
                      x={x - 50}
                      y={y - r - 30}
                      width={100}
                      height={22}
                      rx={4}
                      fill="hsl(var(--popover))"
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                    />
                    <text
                      x={x}
                      y={y - r - 15}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill="hsl(var(--foreground))"
                    >
                      {loc.city} · {loc.activeWorkers}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-6 px-5 py-3 border-t border-border">
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
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {topCountries.map(([country, count]) => (
              <Badge key={country} variant="outline" className="text-[10px] gap-1">
                {country} <span className="font-bold">{count}</span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Simple world outline using latitude dots for context */
function WorldOutline({ width, height }: { width: number; height: number }) {
  // Simplified continent boundary points
  const continentPoints = [
    // North America
    { lat: 60, lng: -130 }, { lat: 55, lng: -120 }, { lat: 50, lng: -100 }, { lat: 45, lng: -90 },
    { lat: 40, lng: -80 }, { lat: 35, lng: -85 }, { lat: 30, lng: -90 }, { lat: 25, lng: -100 },
    { lat: 20, lng: -105 }, { lat: 48, lng: -55 }, { lat: 45, lng: -65 }, { lat: 42, lng: -72 },
    // South America
    { lat: 10, lng: -75 }, { lat: 0, lng: -50 }, { lat: -10, lng: -40 }, { lat: -15, lng: -48 },
    { lat: -23, lng: -43 }, { lat: -33, lng: -70 }, { lat: -40, lng: -65 }, { lat: -50, lng: -70 },
    // Europe
    { lat: 60, lng: 10 }, { lat: 55, lng: 15 }, { lat: 50, lng: 5 }, { lat: 48, lng: 10 },
    { lat: 45, lng: 15 }, { lat: 40, lng: -5 }, { lat: 38, lng: 25 }, { lat: 55, lng: 25 },
    { lat: 65, lng: 25 }, { lat: 60, lng: 30 },
    // Africa
    { lat: 35, lng: 10 }, { lat: 30, lng: 30 }, { lat: 15, lng: 40 }, { lat: 5, lng: 35 },
    { lat: 0, lng: 30 }, { lat: -10, lng: 35 }, { lat: -25, lng: 30 }, { lat: -33, lng: 25 },
    { lat: 5, lng: -5 }, { lat: 15, lng: -15 },
    // Asia
    { lat: 60, lng: 60 }, { lat: 55, lng: 80 }, { lat: 50, lng: 100 }, { lat: 45, lng: 90 },
    { lat: 40, lng: 75 }, { lat: 30, lng: 80 }, { lat: 25, lng: 90 }, { lat: 20, lng: 100 },
    { lat: 35, lng: 105 }, { lat: 40, lng: 120 }, { lat: 35, lng: 130 }, { lat: 45, lng: 140 },
    { lat: 10, lng: 105 }, { lat: 5, lng: 115 },
    // Australia
    { lat: -15, lng: 130 }, { lat: -20, lng: 140 }, { lat: -25, lng: 150 }, { lat: -35, lng: 145 },
    { lat: -30, lng: 115 }, { lat: -20, lng: 120 },
  ];

  return (
    <>
      {continentPoints.map((p, i) => {
        const [x, y] = project(p.lat, p.lng, width, height);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={1.2}
            className="fill-muted-foreground/15"
          />
        );
      })}
    </>
  );
}

/** Draw curved arcs between origin and destination cities */
function Arcs({ width, height }: { width: number; height: number }) {
  const origins = SAMPLE_LOCATIONS.filter((l) => l.type === "origin" || l.type === "both");
  const destinations = SAMPLE_LOCATIONS.filter((l) => l.type === "destination" || l.type === "both");

  // Pick a few representative arcs
  const arcs: [LocationPoint, LocationPoint][] = [];
  origins.slice(0, 4).forEach((o) => {
    destinations.slice(0, 3).forEach((d) => {
      if (o.city !== d.city) arcs.push([o, d]);
    });
  });

  return (
    <>
      {arcs.slice(0, 10).map(([from, to], i) => {
        const [x1, y1] = project(from.lat, from.lng, width, height);
        const [x2, y2] = project(to.lat, to.lng, width, height);
        const midX = (x1 + x2) / 2;
        const midY = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.12;
        return (
          <path
            key={i}
            d={`M${x1},${y1} Q${midX},${midY} ${x2},${y2}`}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth={0.6}
            opacity={0.15}
            strokeDasharray="3,3"
          />
        );
      })}
    </>
  );
}
