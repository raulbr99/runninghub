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
  totalDistance?: number; // Distancia total en km de la actividad
}

export default function ActivityMap({
  encodedPolyline,
  startLat,
  startLng,
  endLat,
  endLng,
  highlightedKm,
  totalDistance,
}: ActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const highlightLayerRef = useRef<L.Polyline | null>(null);
  const coordinatesRef = useRef<[number, number][]>([]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Decodificar polyline
    const coordinates = polyline.decode(encodedPolyline);
    coordinatesRef.current = coordinates;

    if (coordinates.length === 0) return;

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
    if (!totalDistance || totalDistance <= 0) return;

    const coordinates = coordinatesRef.current;
    if (coordinates.length === 0) return;

    const totalPoints = coordinates.length;
    const totalDistanceMeters = totalDistance * 1000;

    // km 1 = 0-1000m, km 2 = 1000-2000m, etc.
    const startDist = (highlightedKm - 1) * 1000;
    const endDist = Math.min(highlightedKm * 1000, totalDistanceMeters);

    // Calcular indices basados en proporcion de la distancia total
    const startIdx = Math.floor((startDist / totalDistanceMeters) * totalPoints);
    const endIdx = Math.min(
      Math.ceil((endDist / totalDistanceMeters) * totalPoints),
      totalPoints - 1
    );

    // Extraer los puntos del segmento
    if (endIdx > startIdx) {
      const segmentPoints = coordinates.slice(startIdx, endIdx + 1);

      if (segmentPoints.length > 1) {
        highlightLayerRef.current = L.polyline(segmentPoints, {
          color: '#F59E0B',
          weight: 8,
          opacity: 1,
        }).addTo(map);
      }
    }
  }, [highlightedKm, totalDistance]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: '320px' }}
    />
  );
}
