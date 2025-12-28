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
}

export default function ActivityMap({
  encodedPolyline,
  startLat,
  startLng,
  endLat,
  endLng,
}: ActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Decodificar polyline
    const coordinates = polyline.decode(encodedPolyline);

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

  return (
    <div
      ref={mapRef}
      className="w-full h-80 rounded-xl overflow-hidden"
      style={{ minHeight: '320px' }}
    />
  );
}
