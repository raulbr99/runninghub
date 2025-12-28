'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import polyline from '@mapbox/polyline';

interface ActivityMapProps {
  encodedPolyline: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  highlightedKm?: number | null;
}

// Calcular distancia entre dos puntos usando formula de Haversine
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ActivityMap({
  encodedPolyline,
  startLat,
  startLng,
  endLat,
  endLng,
  highlightedKm,
}: ActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const highlightLayerRef = useRef<L.Polyline | null>(null);
  const coordinatesRef = useRef<[number, number][]>([]);
  const distancesRef = useRef<number[]>([]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Decodificar polyline
    const coordinates = polyline.decode(encodedPolyline);
    coordinatesRef.current = coordinates;

    if (coordinates.length === 0) return;

    // Calcular distancias acumuladas
    const distances: number[] = [0];
    for (let i = 1; i < coordinates.length; i++) {
      const d = haversineDistance(
        coordinates[i - 1][0], coordinates[i - 1][1],
        coordinates[i][0], coordinates[i][1]
      );
      distances.push(distances[i - 1] + d);
    }
    distancesRef.current = distances;

    // Crear mapa
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // Añadir tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Crear línea de la ruta
    const latLngs = coordinates.map(([lat, lng]) => [lat, lng] as [number, number]);
    const routeLine = L.polyline(latLngs, {
      color: '#10B981',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // Ajustar vista a la ruta
    map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });

    // Marcadores de inicio y fin
    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #22C55E; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #EF4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    // Usar coordenadas del polyline o las proporcionadas
    const start = startLat && startLng ? [startLat, startLng] : coordinates[0];
    const end = endLat && endLng ? [endLat, endLng] : coordinates[coordinates.length - 1];

    L.marker(start as [number, number], { icon: startIcon }).addTo(map).bindPopup('Inicio');
    L.marker(end as [number, number], { icon: endIcon }).addTo(map).bindPopup('Fin');

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [encodedPolyline, startLat, startLng, endLat, endLng]);

  // Actualizar highlight cuando cambia el km
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Eliminar highlight anterior
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    if (highlightedKm === null || highlightedKm === undefined) return;

    const coordinates = coordinatesRef.current;
    const distances = distancesRef.current;
    if (coordinates.length === 0 || distances.length === 0) return;

    // Encontrar puntos para este km (km 1 = 0-1000m, km 2 = 1000-2000m, etc.)
    const startDist = (highlightedKm - 1) * 1000;
    const endDist = highlightedKm * 1000;

    const segmentPoints: [number, number][] = [];

    for (let i = 0; i < coordinates.length; i++) {
      if (distances[i] >= startDist && distances[i] <= endDist) {
        segmentPoints.push(coordinates[i]);
      }
    }

    // Si no hay puntos exactos, interpolar
    if (segmentPoints.length === 0) {
      // Encontrar el punto mas cercano al inicio del segmento
      for (let i = 0; i < distances.length - 1; i++) {
        if (distances[i] <= startDist && distances[i + 1] >= startDist) {
          segmentPoints.push(coordinates[i]);
        }
        if (distances[i] >= startDist && distances[i] <= endDist) {
          segmentPoints.push(coordinates[i]);
        }
        if (distances[i] <= endDist && distances[i + 1] >= endDist) {
          segmentPoints.push(coordinates[i + 1]);
          break;
        }
      }
    }

    if (segmentPoints.length > 1) {
      highlightLayerRef.current = L.polyline(segmentPoints, {
        color: '#F59E0B',
        weight: 8,
        opacity: 1,
      }).addTo(map);
    }
  }, [highlightedKm]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: '320px' }}
    />
  );
}
