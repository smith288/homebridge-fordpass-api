import { Logging } from 'homebridge';
import { VehicleInfo, Command } from './types/vehicle';
import { Connection } from './fordpass-connection';
import { FordpassConfig } from './types/config';
import { EventEmitter } from 'events';

export class Vehicle extends EventEmitter {
  private config: FordpassConfig;
  private readonly log: Logging;
  public info: VehicleInfo | undefined;
  private updating = false;
  name: string;
  vehicleId: string;
  autoRefresh: boolean;
  refreshRate: number;

  constructor(name: string, vehicleId: string, config: FordpassConfig, log: Logging) {
    super();
    this.config = config;
    this.log = log;
    this.name = name;
    this.vehicleId = vehicleId;
    this.autoRefresh = config.options?.autoRefresh || false;
    this.refreshRate = config.options?.refreshRate || 180;
  }

  async issueCommand(command: Command): Promise<string> {
    
    if(this.updating){
      this.log.debug('Command already in progress');
      return '';
    }
    this.updating = true;

    let commandType = '';
    switch (command) {
      case Command.START: {
        commandType = 'remoteStart';
        break;
      }
      case Command.STOP: {
        commandType = 'stop';
        break;
      }
      case Command.LOCK: {
        commandType = 'lock';
        break;
      }
      case Command.UNLOCK: {
        commandType = 'unlock';
        break;
      }
      case Command.REFRESH: {
        commandType = 'status';
        break;
      }
      default: {
        this.log.error('invalid command');
        break;
      }
    }

    if (commandType) {

      // Call the fordpass-connection commands here

      try{
        const result = await new Connection(this.config, this.log).issueCommand(this.vehicleId, commandType);
        if (result) {
          this.log.debug(`Issuing command: ${commandType} for vehicle: ${this.vehicleId}`);
          if(command !== Command.REFRESH){
            await new Connection(this.config, this.log).issueCommand(this.vehicleId, 'status');
          }
          this.updating = false;
          return result.commandId;
        }
      } catch (error: any) {
        this.updating = false;
        this.log.error(`Error occurred during request: ${error.message}`);
        if (error.response) {
          // Log detailed information about the response if available
          this.log.error(`Response status: ${error.response.status}`);
          this.log.error(`Response data: ${JSON.stringify(error.response.data)}`);
          this.log.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
        } else if (error.request) {
          // Log information about the request
          this.log.error(`Request made but no response received: ${error.request}`);
        } else {
          // Log general error information
          this.log.error(`Error details: ${JSON.stringify(error)}`);
        }
      }
    }
    return '';
  }

  async issueCommandRefresh(commandId: string, command: Command): Promise<any> {

    if(this.updating){
      this.log.debug('Command already in progress');
      return '';
    }
    this.updating = true;
    let commandType = '';
    switch (command) {
      case Command.START: {
        commandType = 'remoteStart';
        break;
      }
      case Command.STOP: {
        commandType = 'stop';
        break;
      }
      case Command.LOCK: {
        commandType = 'lock';
        break;
      }
      case Command.UNLOCK: {
        commandType = 'unlock';
        break;
      }
      case Command.REFRESH: {
        commandType = 'status';
        break;
      }
      default: {
        this.log.error('invalid command');
        break;
      }
    }

    if (commandType) {
      try{
        this.log.debug(`Issuing command: ${commandType} for vehicle: ${this.vehicleId}`);
        const result = await new Connection(this.config, this.log).issueCommandRefresh(commandId, this.vehicleId, commandType);
        if (result) {
          this.updating = false;
          return result;
        }
      } catch (error: any) {

        this.updating = false;
        this.log.error(`Error occurred during request: ${error.message}`);
        if (error.response) {
          // Log detailed information about the response if available
          this.log.error(`Response status: ${error.response.status}`);
          this.log.error(`Response data: ${JSON.stringify(error.response.data)}`);
          this.log.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
        } else if (error.request) {
          // Log information about the request
          this.log.error(`Request made but no response received: ${error.request}`);
        } else {
          // Log general error information
          this.log.error(`Error details: ${JSON.stringify(error)}`);
        }
      }
    }
    return '';
  }

  async retrieveVehicleInfo() {

    const result = await new Connection(this.config, this.log).getVehicleInformation(this.vehicleId);
    if (result) {
      this.log.debug(`Retrieved vehicle information for vehicle.  Mileage: ${result.vehicleDetails.mileage} Distance to E: ${result.vehicleDetails.batteryChargeLevel.distanceToEmpty} Tire Pressure Warning: ${result.vehicleStatus.tirePressureWarning}`);
      this.info = result as VehicleInfo;
      this.vehicleId = result.vehicleId;
      this.name = result.nickName;
    }
    return undefined;
  }
}