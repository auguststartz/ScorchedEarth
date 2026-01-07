// Custom game settings configuration

export interface WeaponSettings {
  damage: number;
  ammo: number;  // -1 for unlimited
}

export interface CustomGameSettings {
  gravity: number;
  weapons: {
    standard: WeaponSettings;
    heavy: WeaponSettings;
    cluster: WeaponSettings;
    mirv: WeaponSettings;
    digger: WeaponSettings;
    napalm: WeaponSettings;
  };
}

export const DEFAULT_CUSTOM_SETTINGS: CustomGameSettings = {
  gravity: 980,
  weapons: {
    standard: { damage: 30, ammo: -1 },
    heavy: { damage: 50, ammo: 3 },
    cluster: { damage: 20, ammo: 3 },
    mirv: { damage: 35, ammo: 3 },
    digger: { damage: 40, ammo: 3 },
    napalm: { damage: 15, ammo: 2 }
  }
};
