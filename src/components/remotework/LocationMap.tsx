import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, TrendingUp, Send, X, Building2, AlertTriangle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import * as topojson from "topojson-client";

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

const W = 960;
const H = 500;

// Equirectangular (flat) projection
function projectMerc(lat: number, lng: number): [number, number] {
  const x = ((lng + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return [x, y];
}

// Convert GeoJSON coordinates to SVG path string
function geoToPath(coords: number[][][]): string {
  return coords
    .map((ring) => {
      const pts = ring.map(([lng, lat]) => projectMerc(lat, lng));
      return "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
    })
    .join("");
}

function featureToPath(geometry: any): string {
  if (geometry.type === "Polygon") {
    return geoToPath(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((poly: number[][][]) => geoToPath(poly)).join("");
  }
  return "";
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
  const [countryPaths, setCountryPaths] = useState<string[]>([]);

  // Zoom / pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load TopoJSON
  useEffect(() => {
    fetch("/world-110m.json")
      .then((r) => r.json())
      .then((topo) => {
        const geo = topojson.feature(topo, topo.objects.countries) as any;
        const paths = geo.features.map((f: any) => featureToPath(f.geometry));
        setCountryPaths(paths);
      })
      .catch(() => {});
  }, []);

  const totalWorkers = useMemo(() => SAMPLE_LOCATIONS.reduce((s, l) => s + l.activeWorkers, 0), []);
  const totalAssignments = useMemo(() => SAMPLE_LOCATIONS.reduce((s, l) => s + l.availableAssignments, 0), []);

  const handleDotClick = (e: React.MouseEvent, loc: LocationPoint) => {
    e.stopPropagation();
    setSelected(selected?.city === loc.city ? null : loc);
  };

  const handleRequestClick = () => {
    if (selected && onRequestFromLocation) {
      onRequestFromLocation(selected);
      setSelected(null);
    }
  };

  const handleZoom = useCallback((delta: number) => {
    setZoom((z) => Math.max(0.8, Math.min(6, z + delta)));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? -0.2 : 0.2);
  }, [handleZoom]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx / zoom, y: panStart.current.panY + dy / zoom });
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch pan/zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - panStart.current.x;
    const dy = e.touches[0].clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx / zoom, y: panStart.current.panY + dy / zoom });
  }, [isPanning, zoom]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Compute viewBox based on zoom/pan
  const vbW = W / zoom;
  const vbH = H / zoom;
  const vbX = (W - vbW) / 2 - pan.x;
  const vbY = (H - vbH) / 2 - pan.y;

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
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
          <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm" onClick={() => handleZoom(0.4)}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm" onClick={() => handleZoom(-0.4)}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm" onClick={resetView}>
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* SVG Map */}
        <div
          ref={containerRef}
          className="select-none mx-3 mb-1 rounded-lg overflow-hidden border border-border/50"
          style={{ cursor: isPanning ? "grabbing" : "grab", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <svg
            viewBox={`${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
            className="w-full h-auto"
            style={{ minHeight: 340 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="ocean-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 60%, 95%)" />
                <stop offset="100%" stopColor="hsl(200, 40%, 90%)" />
              </linearGradient>
              <linearGradient id="land-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--secondary))" />
                <stop offset="100%" stopColor="hsl(var(--muted))" />
              </linearGradient>
              <filter id="land-shadow">
                <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="hsl(var(--foreground))" floodOpacity="0.08" />
              </filter>
            </defs>

            {/* Ocean background */}
            <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="url(#ocean-gradient)" />

            {/* Country fills */}
            {countryPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="url(#land-gradient)"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={0.4}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.95}
                filter="url(#land-shadow)"
                style={{ transition: "opacity 0.2s" }}
              />
            ))}

            {/* Graticule lines */}
            <Graticule />

            {/* Connection arcs */}
            <Arcs selected={selected} />

            {/* Location dots */}
            {SAMPLE_LOCATIONS.map((loc) => {
              const [x, y] = projectMerc(loc.lat, loc.lng);
              const baseR = Math.max(5, Math.min(12, loc.activeWorkers * 0.55));
              // Scale radius inversely with zoom so dots stay usable
              const r = baseR / Math.max(1, zoom * 0.6);
              const isHovered = hovered?.city === loc.city;
              const isSelected = selected?.city === loc.city;
              const hasAssignments = loc.availableAssignments > 0;

              return (
                <g
                  key={loc.city}
                  onMouseEnter={() => setHovered(loc)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => handleDotClick(e, loc)}
                  className="cursor-pointer"
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle cx={x} cy={y} r={r + 6 / zoom} fill="none" stroke="hsl(var(--primary))" strokeWidth={2 / zoom} strokeDasharray={`${4 / zoom},${2 / zoom}`}>
                      <animate attributeName="stroke-dashoffset" from="0" to={`${-12 / zoom}`} dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Pulse */}
                  <circle cx={x} cy={y} r={r + 3 / zoom} fill={riskDotColors[loc.riskLevel]} opacity={isHovered || isSelected ? 0.3 : 0.1}>
                    {!isHovered && !isSelected && (
                      <animate attributeName="r" from={r + 2 / zoom} to={r + 8 / zoom} dur="2.5s" repeatCount="indefinite" />
                    )}
                    <animate attributeName="opacity" from={isHovered || isSelected ? 0.3 : 0.15} to="0" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  {/* Main dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered || isSelected ? r + 1.5 / zoom : r}
                    fill={riskDotColors[loc.riskLevel]}
                    stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--background))"}
                    strokeWidth={(isSelected ? 2.5 : 1.5) / zoom}
                    opacity={0.92}
                    style={{ transition: "all 0.15s ease" }}
                  />
                  {/* Badge for open assignments */}
                  {hasAssignments && (
                    <>
                      <circle cx={x + r * 0.9} cy={y - r * 0.9} r={5 / zoom} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1 / zoom} />
                      <text x={x + r * 0.9} y={y - r * 0.9 + 3 / zoom} textAnchor="middle" fontSize={6 / zoom} fontWeight={700} fill="hsl(var(--primary-foreground))">
                        {loc.availableAssignments}
                      </text>
                    </>
                  )}
                  {/* Tooltip */}
                  {(isHovered || isSelected) && (
                    <>
                      <rect
                        x={x - 65 / zoom}
                        y={y - r - 38 / zoom}
                        width={130 / zoom}
                        height={30 / zoom}
                        rx={5 / zoom}
                        fill="hsl(var(--popover))"
                        stroke="hsl(var(--border))"
                        strokeWidth={0.6 / zoom}
                        filter="drop-shadow(0 1px 3px rgba(0,0,0,0.12))"
                      />
                      <text x={x} y={y - r - 24 / zoom} textAnchor="middle" fontSize={9 / zoom} fontWeight={600} fill="hsl(var(--foreground))">
                        {loc.city}, {loc.country}
                      </text>
                      <text x={x} y={y - r - 13 / zoom} textAnchor="middle" fontSize={7 / zoom} fill="hsl(var(--muted-foreground))">
                        {loc.activeWorkers} workers · {loc.availableAssignments} open · {riskLabels[loc.riskLevel]}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

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
          <p className="ml-auto text-[10px] text-muted-foreground">Scroll to zoom · Drag to pan · Click a location to request</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Subtle graticule grid lines */
function Graticule() {
  const lines: string[] = [];
  // Latitude lines every 30°
  for (let lat = -60; lat <= 80; lat += 30) {
    const pts: string[] = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      const [x, y] = projectMerc(lat, lng);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    lines.push("M" + pts.join("L"));
  }
  // Longitude lines every 30°
  for (let lng = -180; lng <= 180; lng += 30) {
    const pts: string[] = [];
    for (let lat = -80; lat <= 84; lat += 5) {
      const [x, y] = projectMerc(lat, lng);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    lines.push("M" + pts.join("L"));
  }
  return (
    <>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="hsl(var(--border))" strokeWidth={0.25} opacity={0.35} strokeDasharray="2,4" />
      ))}
    </>
  );
}

/** Draw curved arcs between origin and destination cities */
function Arcs({ selected }: { selected: LocationPoint | null }) {
  const origins = SAMPLE_LOCATIONS.filter((l) => l.type === "origin" || l.type === "both");
  const destinations = SAMPLE_LOCATIONS.filter((l) => l.type === "destination" || l.type === "both");

  const arcs: [LocationPoint, LocationPoint][] = [];

  if (selected) {
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
        const [x1, y1] = projectMerc(from.lat, from.lng);
        const [x2, y2] = projectMerc(to.lat, to.lng);
        const midX = (x1 + x2) / 2;
        const midY = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.12;
        return (
          <path
            key={i}
            d={`M${x1},${y1} Q${midX},${midY} ${x2},${y2}`}
            fill="none"
            stroke={selected ? "hsl(var(--primary))" : "hsl(var(--accent))"}
            strokeWidth={selected ? 1.2 : 0.7}
            opacity={selected ? 0.35 : 0.18}
            strokeDasharray="4,3"
          />
        );
      })}
    </>
  );
}
