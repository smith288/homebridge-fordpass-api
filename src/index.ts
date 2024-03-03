import {
  API,
  APIEvent,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
} from 'homebridge';
import { Vehicle } from './fordpass';
import { Command } from './types/vehicle';
import { FordpassConfig, VehicleConfig } from './types/config';
import { Connection } from './fordpass-connection';
import { FordpassAccessory } from './accessory';

let hap: HAP;
let Accessory: typeof PlatformAccessory;

const PLUGIN_NAME = 'homebridge-fordpass-api';
const PLATFORM_NAME = 'FordPass';

class FordPassPlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  private readonly accessories: Array<PlatformAccessory> = [];
  private readonly vehicles: Array<Vehicle> = [];
  private config: FordpassConfig;
  private pendingLockUpdate = false;

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.api = api;
    this.config = config as FordpassConfig;

    // Need a config or plugin will not start
    if (!config) {
      return;
    }

    // if (!config.username || !config.password) {
    //   this.log.error('Please add a userame and password to your config.json');
    //   return;
    // }

    api.on(APIEvent.DID_FINISH_LAUNCHING, this.didFinishLaunching.bind(this));
  }

  configureAccessory(accessory: PlatformAccessory): void {
    const self = this;
    this.log.info(`Configuring accessory ${accessory.displayName}`);

    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log.info(`${accessory.displayName} identified!`);
    });

    const vehicle = new Vehicle(accessory.context.name, accessory.context.vehicleId, this.config, this.log);
    const fordAccessory = new FordpassAccessory(accessory);

    // Create Lock service
    const defaultState = hap.Characteristic.LockTargetState.UNSECURED;
    const lockService = fordAccessory.createService(hap.Service.LockMechanism, 'Lock');
    const switchService = fordAccessory.createService(hap.Service.Switch, 'Power');
    const batteryService = fordAccessory.createService(
      hap.Service.Battery,
      this.config.options?.batteryName || 'Fuel Level',
    );

    if (this.config.options?.chargingSwitch) {
      fordAccessory.createService(hap.Service.OccupancySensor, 'Charging');
    } else {
      fordAccessory.removeService(hap.Service.OccupancySensor, 'Charging');
    }

    if (this.config.options?.plugSwitch) {
      fordAccessory.createService(hap.Service.OccupancySensor, 'Plug');
    } else {
      fordAccessory.removeService(hap.Service.OccupancySensor, 'Plug');
    }

    lockService.setCharacteristic(hap.Characteristic.LockCurrentState, defaultState);

    lockService
      .setCharacteristic(hap.Characteristic.LockTargetState, defaultState)
      .getCharacteristic(hap.Characteristic.LockTargetState)
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.log.debug(`${value ? 'Locking' : 'Unlocking'} ${accessory.displayName}`);
        let commandId = '';
        let command = Command.LOCK;
        if (value === hap.Characteristic.LockTargetState.UNSECURED) {
          command = Command.UNLOCK;
        }
        commandId = await vehicle.issueCommand(command);

        let tries = 30;
        this.pendingLockUpdate = true;
        const self = this; 
        const status = await vehicle.issueCommandRefresh(commandId, command);
        if (status?.currentStatus === 'SUCCESS') {
          lockService.updateCharacteristic(hap.Characteristic.LockCurrentState, value);
          self.pendingLockUpdate = false;
          
        }
        callback(undefined, value);
      })
      .on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
        // Return cached value immediately then update properly
        let lockNumber = hap.Characteristic.LockTargetState.UNSECURED;
        const lockStatus =
          vehicle?.info?.vehicleStatus.lockStatus?.value || 'LOCKED';
        if (lockStatus === 'LOCKED') {
          lockNumber = hap.Characteristic.LockTargetState.SECURED;
        }

        callback(undefined, lockNumber);

        const vehicleInformationReq = await vehicle.retrieveVehicleInfo();
        if (vehicleInformationReq) {
          const lockStatus =
            vehicle?.info?.vehicleStatus.lockStatus?.value || 'LOCKED';
          let lockNumber = hap.Characteristic.LockTargetState.UNSECURED;
          if (lockStatus === 'LOCKED') {
            lockNumber = hap.Characteristic.LockTargetState.SECURED;
          }
          lockService.updateCharacteristic(hap.Characteristic.LockTargetState, lockNumber);
        } else {
          self.log.error(`Cannot get information for ${accessory.displayName} lock`);
        }
      });

    switchService
      .setCharacteristic(hap.Characteristic.On, false)
      .getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.log.debug(`${value ? 'Starting' : 'Stopping'} ${accessory.displayName}`);
        if (value as boolean) {
          await vehicle.issueCommand(Command.START);
        } else {
          await vehicle.issueCommand(Command.STOP);
        }
        callback(undefined, value);
      })
      .on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
        // Return cached value immediately then update properly
        const engineStatus = vehicle?.info?.vehicleStatus.ignitionStatus.value || 'OFF';
        callback(undefined, engineStatus);

        var vehicleInformationReq = await vehicle.retrieveVehicleInfo();
        if (vehicleInformationReq) {
          const engineStatus = vehicle?.info?.vehicleStatus.ignitionStatus.value || 'OFF';
          switchService.updateCharacteristic(hap.Characteristic.On, engineStatus === 'ON');
        } else {
          self.log.error(`Cannot get information for ${accessory.displayName} engine`);
        }
      });

    batteryService
      .setCharacteristic(hap.Characteristic.BatteryLevel, 100)
      .getCharacteristic(hap.Characteristic.BatteryLevel)
      .on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
        // Return cached value immediately then update properly
        const fuel = vehicle?.info?.vehicleStatus.fuelLevel?.value as number;
        const battery = vehicle?.info?.vehicleDetails.batteryChargeLevel?.value as number;
        let level = fuel || battery || 100;
        if (level > 100) {
          level = 100;
        }
        if (level < 0) {
          level = 0;
        }
        callback(undefined, level);

        var vehicleInformationReq = await vehicle.retrieveVehicleInfo();
        if (vehicle?.info?.vehicleStatus) {
          const fuel = vehicle?.info?.vehicleStatus.fuelLevel?.value as number;
          const battery = vehicle?.info?.vehicleDetails.batteryChargeLevel?.value as number;
          const chargingStatus = vehicle?.info?.vehicleStatus.chargingStatus?.value;
          let level = fuel || battery || 100;
          if (level > 100) {
            level = 100;
          }
          if (level < 0) {
            level = 0;
          }
          batteryService.updateCharacteristic(hap.Characteristic.BatteryLevel, level);
          if (battery) {
            if (chargingStatus === 'ChargingAC') {
              batteryService.updateCharacteristic(
                hap.Characteristic.ChargingState,
                hap.Characteristic.ChargingState.CHARGING,
              );
            } else {
              batteryService.updateCharacteristic(
                hap.Characteristic.ChargingState,
                hap.Characteristic.ChargingState.NOT_CHARGING,
              );
            }
          } else {
            batteryService.updateCharacteristic(
              hap.Characteristic.ChargingState,
              hap.Characteristic.ChargingState.NOT_CHARGEABLE,
            );
          }

          if (level < 10) {
            batteryService.updateCharacteristic(
              hap.Characteristic.StatusLowBattery,
              hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW,
            );
          } else {
            batteryService.updateCharacteristic(
              hap.Characteristic.StatusLowBattery,
              hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
            );
          }
        } else {
          self.log.error(`Cannot get information for ${accessory.displayName} engine`);
        }
      });
    this.vehicles.push(vehicle);
    this.accessories.push(accessory);
  }

  async didFinishLaunching(): Promise<void> {
    const ford = new Connection(this.config, this.log);
    const authInfo = await ford.auth();
    if (authInfo) {
      setInterval(async () => {
        this.log.debug('Reauthenticating with refresh token');
        await ford.getRefreshToken();
      }, authInfo.expires_in * 1000 - 10000);

      this.log.debug('Copy access and refresh tokens to config');
      this.log.debug(`Access Token: ${authInfo.access_token}`);
      this.log.debug(`Refresh Token: ${authInfo.refresh_token}`);

      await this.addVehicles(ford);
      await this.updateVehicles();
      await this.refreshVehicles();

      // Vehicle info needs to be updated every 5 minutes
      setInterval(async () => {
        await this.updateVehicles();
      }, 60 * 1000 * 5);
    }
  }

  async addVehicles(connection: Connection): Promise<void> {
    const vehicles = await connection.getVehicles();
    vehicles?.forEach(async (vehicle: VehicleConfig) => {
      vehicle.vehicleId = vehicle.vehicleId.toUpperCase();
      const name = vehicle.nickName || vehicle.modelYear + ' ' + vehicle.make + ' ' + vehicle.modelName;
      const uuid = hap.uuid.generate(vehicle.vehicleId);
      const accessory = new Accessory(name, uuid);
      accessory.context.name = name;
      accessory.context.vehicleId = vehicle.vehicleId;

      const accessoryInformation = accessory.getService(hap.Service.AccessoryInformation);
      if (accessoryInformation) {
        accessoryInformation.setCharacteristic(hap.Characteristic.Manufacturer, 'Ford');
        accessoryInformation.setCharacteristic(hap.Characteristic.Model, name);
        accessoryInformation.setCharacteristic(hap.Characteristic.SerialNumber, vehicle.vehicleId);
      }

      // Only add new cameras that are not cached
      if (!this.accessories.find((x: PlatformAccessory) => x.UUID === uuid)) {
        this.log.debug(`New vehicle found: ${name}`);
        this.configureAccessory(accessory); // abusing the configureAccessory here
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    });

    // Remove vehicles that were removed from config
    this.accessories.forEach((accessory: PlatformAccessory<Record<string, string>>) => {
      if (!vehicles?.find((x: VehicleConfig) => x.vehicleId === accessory.context.vehicleId)) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        const index = this.accessories.indexOf(accessory);
        if (index > -1) {
          this.accessories.splice(index, 1);
          this.vehicles.slice(index, 1);
        }
      }
    });
  }

  async updateVehicles(): Promise<void> {
    this.vehicles.forEach(async (vehicle: Vehicle) => {

      const statusReqId = await vehicle.issueCommand(Command.REFRESH);
      let statusReqStatus = 'QUEUED';
      let tries = 30;
      if (statusReqId) {
        while (statusReqStatus === 'QUEUED' && tries > 0) {
          statusReqStatus = await vehicle.issueCommandRefresh(statusReqId, Command.REFRESH);
          tries--;
        }
      }
      await vehicle.retrieveVehicleInfo();
      const status = vehicle?.info?.vehicleStatus;
      const lockStatus = status?.lockStatus?.value;
      let lockNumber = hap.Characteristic.LockCurrentState.UNSECURED;
      if (lockStatus === 'LOCKED') {
        lockNumber = hap.Characteristic.LockCurrentState.SECURED;
      }

      const engineStatus = status?.ignitionStatus.value;
      let started = true;
      if (engineStatus === 'OFF') {
        started = false;
      }
      const uuid = hap.uuid.generate(vehicle.vehicleId);
      const accessory = this.accessories.find((x: PlatformAccessory) => x.UUID === uuid);
      if (accessory) {
        const fordAccessory = new FordpassAccessory(accessory);

        if (!this.pendingLockUpdate) {
          const lockService = fordAccessory.findService(hap.Service.LockMechanism);
          lockService && lockService.updateCharacteristic(hap.Characteristic.LockCurrentState, lockNumber);
          lockService && lockService.updateCharacteristic(hap.Characteristic.LockTargetState, lockNumber);
        }
        const switchService = fordAccessory.findService(hap.Service.Switch);
        switchService && switchService.updateCharacteristic(hap.Characteristic.On, started);

        const plugService = fordAccessory.findService(hap.Service.OccupancySensor, 'Plug');
        plugService &&
          plugService.updateCharacteristic(
            hap.Characteristic.OccupancyDetected,
            status?.plugStatus?.value
              ? hap.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
              : hap.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
          );

        this.log.debug(`Charging status: ${status?.chargingStatus?.value}`);
        const chargingService = fordAccessory.findService(hap.Service.OccupancySensor, 'Charging');
        chargingService &&
          chargingService.updateCharacteristic(
            hap.Characteristic.OccupancyDetected,
            status?.chargingStatus?.value === 'ChargingAC'
              ? hap.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
              : hap.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
          );
      } else {
        this.log.warn(`Accessory not found for ${vehicle.name}`);
      }
    });
  }

  async refreshVehicles(): Promise<void> {
    this.vehicles.forEach(async (vehicle: Vehicle) => {
      this.log.debug(`Configuring ${vehicle.name} (${this.config.autoRefresh}) to refresh every ${this.config.refreshRate} minutes.`);
      if (vehicle.autoRefresh && vehicle.refreshRate && vehicle.refreshRate > 0) {
        this.log.debug(`Configuring ${vehicle.name} to refresh every ${vehicle.refreshRate} minutes.`);
        setInterval(async () => {
          this.log.debug(`Refreshing info for ${vehicle.name}`);
          await vehicle.issueCommand(Command.REFRESH);
        }, 60000 * vehicle.refreshRate);
      }
    });
  }
}

export = (api: API): void => {
  hap = api.hap;
  Accessory = api.platformAccessory;

  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, FordPassPlatform);
};