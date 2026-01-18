"use client";

import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DriverMarker } from "./DriverMarker";
import { DRIVER_POSITIONS_MOCK } from "../../mocks/driverPositions";

// Fix for default Leaflet icons if we use them (not strictly needed for DivIcon but good practice)
import L from "leaflet";
import { useEffect } from "react";

export default function LiveFleetMap() {
  const parisPosition = [48.8566, 2.3522] as [number, number];

  // Leaflet CSS cleanup for React
  useEffect(() => {
    // This effect ensures any necessary cleanup or fixups happen on client mount
  }, []);

  return (
    <div className="h-full w-full relative isolate bg-slate-100 rounded-md overflow-hidden border border-slate-200">
       <MapContainer 
         center={parisPosition} 
         zoom={12} 
         scrollWheelZoom={true} 
         className="h-full w-full z-0"
         zoomControl={false}
         style={{ height: "100%", width: "100%" }}
       >
         <TileLayer
           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
           url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
         />
         <ZoomControl position="bottomright" />
         
         {DRIVER_POSITIONS_MOCK.map((driver) => (
           <DriverMarker key={driver.id} driver={driver} />
         ))}
       </MapContainer>
    </div>
  );
}
