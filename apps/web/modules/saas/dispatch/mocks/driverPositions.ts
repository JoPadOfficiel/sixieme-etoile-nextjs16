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
    name: "Pierre Lefebvre",
    status: "ACTIVE",
    lat: 48.8566,
    lng: 2.3522, // Paris Center
    vehicleType: "SEDAN",
  },
  {
    id: "d2",
    name: "Sophie Dubois",
    status: "ACTIVE",
    lat: 48.8606,
    lng: 2.3376, // Louvre
    vehicleType: "VAN",
  },
  {
    id: "d3",
    name: "Ahmed Benali",
    status: "INACTIVE",
    lat: 48.8448,
    lng: 2.3735, // Gare de Lyon
    vehicleType: "SEDAN",
  },
  {
    id: "d4",
    name: "Marie Martin",
    status: "ACTIVE",
    lat: 48.8738,
    lng: 2.295, // Arc de Triomphe
    vehicleType: "VAN",
  },
  {
    id: "d5",
    name: "Jean Dupont",
    status: "INACTIVE",
    lat: 48.8922,
    lng: 2.2378, // La Defense
    vehicleType: "SEDAN",
  },
  {
    id: "d6",
    name: "Lucie Bernard",
    status: "ACTIVE",
    lat: 48.8352,
    lng: 2.3219, // Montparnasse
    vehicleType: "VAN",
  },
  {
    id: "d7",
    name: "Thomas Petit",
    status: "INACTIVE",
    lat: 48.8837,
    lng: 2.3444, // Montmartre
    vehicleType: "SEDAN",
  },
];
