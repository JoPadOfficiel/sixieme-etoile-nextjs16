"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { DriverPosition } from "../../mocks/driverPositions";

const createDriverIcon = (status: DriverPosition["status"]) => {
  const color = status === "ACTIVE" ? "#10B981" : "#9CA3AF"; // emerald-500 or gray-400
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" width="24" height="24">
      <circle cx="12" cy="12" r="10" />
    </svg>
  `;

  return L.divIcon({
    className: "custom-driver-marker",
    html: svg,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface DriverMarkerProps {
    driver: DriverPosition;
}

export const DriverMarker = ({ driver }: DriverMarkerProps) => {
    return (
        <Marker 
            position={[driver.lat, driver.lng]} 
            icon={createDriverIcon(driver.status)}
        >
            <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                <span>{driver.name} ({driver.status})</span>
            </Tooltip>
        </Marker>
    );
};
