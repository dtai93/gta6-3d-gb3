// The Industrial Docks service menu and its paid vehicle work.

import { fitDockPlate, installTideTune, repairVehicle, resprayVehicle } from './vehicles.js';
import { DOCK_GARAGE as GARAGE_POINT } from './config.js';

export const DOCK_GARAGE = { ...GARAGE_POINT, radius: 12, district: 'Industrial Docks' };

export const GARAGE_SERVICES = [
  { id: 'respray', title: 'Lagoon enamel', detail: 'Harbor teal respray', cost: 240 },
  { id: 'plates', title: 'Dock plates', detail: 'Stamped SOLANO plates', cost: 160 },
  { id: 'tune', title: 'Tide tune', detail: 'Sharper pull and +11 km/h', cost: 650 },
  { id: 'repair', title: 'Yard repair', detail: 'Restore vehicle condition', cost: 180 },
];

export function serviceVehicle(car, serviceId, cash) {
  const service = GARAGE_SERVICES.find((item) => item.id === serviceId);
  if (!service) return { ok: false, cash, message: 'Unknown dock service' };
  if (!car) return { ok: false, cash, message: 'Bring a vehicle to the stall' };
  if (serviceId === 'plates' && car.plate) return { ok: false, cash, message: 'Dock plates already fitted' };
  if (serviceId === 'tune' && car.tuned) return { ok: false, cash, message: 'Tide tune already fitted' };
  if (cash < service.cost) return { ok: false, cash, message: 'Not enough cash for ' + service.title };
  if (serviceId === 'respray') resprayVehicle(car);
  else if (serviceId === 'plates') fitDockPlate(car);
  else if (serviceId === 'tune') installTideTune(car);
  else repairVehicle(car);
  return { ok: true, cash: cash - service.cost, message: service.title.toUpperCase() + ' FITTED  −$' + service.cost };
}
