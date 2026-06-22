export type ResidentElectricityDeviceState = {
  washingMachine: boolean;
  dishwasher: boolean;
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
