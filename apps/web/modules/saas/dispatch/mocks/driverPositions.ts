export type DriverStatus = "ACTIVE" | "INACTIVE";

export interface DriverPosition {
  id: string;
  name: string;
  status: DriverStatus;
  lat: number;
  lng: number;
  vehicleType?: "SEDAN" | "VAN";
}

export const DRIVER_POSITIONS_MOCK: DriverPosition[] = [
  {
    id: "d1",
    name: "Jean Dupont",
    status: "ACTIVE",
    lat: 48.8566,
    lng: 2.3522, // Paris Center
    vehicleType: "SEDAN",
  },
  {
    id: "d2",
    name: "Marie Curie",
    status: "ACTIVE",
    lat: 48.8606,
    lng: 2.3376, // Louvre
    vehicleType: "VAN",
  },
  {
    id: "d3",
    name: "Paul Martin",
    status: "INACTIVE",
    lat: 48.8448,
    lng: 2.3735, // Gare de Lyon
    vehicleType: "SEDAN",
  },
  {
    id: "d4",
    name: "Sarah Connors",
    status: "ACTIVE",
    lat: 48.8738,
    lng: 2.295, // Arc de Triomphe
    vehicleType: "VAN",
  },
  {
    id: "d5",
    name: "Bruce Wayne",
    status: "INACTIVE",
    lat: 48.8922,
    lng: 2.2378, // La Defense
    vehicleType: "SEDAN",
  },
];
