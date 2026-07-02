export type ResidentElectricityDeviceState = {
  washingMachine: boolean;
  dishwasher: boolean;
};

export type ElectricityDeviceMode = "alwaysOn" | "scheduled" | "manual";

export type ElectricityScheduleSlot = {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export type ResidentCustomElectricityDevice = {
  id: string;
  name: string;
  icon: string;
  category: string;
  powerValue: string;
  powerUnit: string;
  voltageValue: string;
  voltageUnit: string;
  frequencyValue: string;
  frequencyUnit: string;
  mode: ElectricityDeviceMode;
  isOn: boolean;
  scheduleSlots: ElectricityScheduleSlot[];
};

export const defaultResidentElectricityDeviceState: ResidentElectricityDeviceState = {
  washingMachine: false,
  dishwasher: false,
};

export function getResidentElectricityDeviceStateKey(householdId: string) {
  return `resident-electricity-device-states:${householdId}`;
}

export function readResidentElectricityDeviceState(
  householdId: string,
): ResidentElectricityDeviceState {
  if (typeof window === "undefined") {
    return defaultResidentElectricityDeviceState;
  }

  try {
    const storedState = window.localStorage.getItem(
      getResidentElectricityDeviceStateKey(householdId),
    );

    if (!storedState) {
      return defaultResidentElectricityDeviceState;
    }

    const parsedState = JSON.parse(storedState) as Partial<ResidentElectricityDeviceState>;

    return {
      washingMachine:
        typeof parsedState.washingMachine === "boolean"
          ? parsedState.washingMachine
          : defaultResidentElectricityDeviceState.washingMachine,
      dishwasher:
        typeof parsedState.dishwasher === "boolean"
          ? parsedState.dishwasher
          : defaultResidentElectricityDeviceState.dishwasher,
    };
  } catch {
    return defaultResidentElectricityDeviceState;
  }
}

export function writeResidentElectricityDeviceState(
  householdId: string,
  state: ResidentElectricityDeviceState,
) {
  window.localStorage.setItem(
    getResidentElectricityDeviceStateKey(householdId),
    JSON.stringify(state),
  );
}

function getCustomDevicesKey(householdId: string) {
  return `resident-electricity-custom-devices:${householdId}`;
}

export function readResidentCustomElectricityDevices(
  householdId: string,
): ResidentCustomElectricityDevice[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(getCustomDevicesKey(householdId));
    return value ? (JSON.parse(value) as ResidentCustomElectricityDevice[]) : [];
  } catch {
    return [];
  }
}

export function writeResidentCustomElectricityDevices(
  householdId: string,
  devices: ResidentCustomElectricityDevice[],
) {
  window.localStorage.setItem(getCustomDevicesKey(householdId), JSON.stringify(devices));
  window.dispatchEvent(new CustomEvent("resident-electricity-devices-updated"));
}

export function getElectricityDeviceStatus(
  device: Pick<ResidentCustomElectricityDevice, "mode" | "isOn" | "scheduleSlots">,
  now = new Date(),
) {
  if (!device.isOn) return "Off" as const;
  if (device.mode !== "scheduled") return "Active" as const;

  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  const time = now.toTimeString().slice(0, 5);
  const active = device.scheduleSlots.some(
    (slot) =>
      slot.enabled &&
      slot.days.includes(day) &&
      time >= slot.startTime &&
      time <= slot.endTime,
  );
  return active ? ("Active" as const) : ("Scheduled" as const);
}
