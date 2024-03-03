import axios from 'axios';
import { AxiosRequestConfig } from 'axios';
import { Logging } from 'homebridge';
import { VehicleInfo, Command } from './types/vehicle';
import { Connection } from './fordpass-connection';
import { CommandStatus } from './types/command';
import { FordpassConfig } from './types/config';
import { once, EventEmitter } from 'events';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'User-Agent': 'FordPass/5 CFNetwork/1333.0.4 Darwin/21.5.0',
};


const handleError = function (name: string, status: number, log: Logging): void {
  log.error(`${name} failed with status: ${status}`);
};

export class Vehicle extends EventEmitter {
  private config: FordpassConfig;
  private readonly log: Logging;
  public info: VehicleInfo | undefined;
  private applicationId: string;
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
    this.applicationId = config.options?.application_id || '';
  }

  async issueCommand(command: Command): Promise<string> {

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

      const result = await new Connection(this.config, this.log).issueCommand(this.vehicleId, commandType);
      if (result) {
        return result.commandId;
      }
      try{
        this.log.debug(`Issuing command: ${commandType} for vehicle: ${this.vehicleId}`);
      } catch (error: any) {
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
      const result = await new Connection(this.config, this.log).issueCommandRefresh(commandId, this.vehicleId, commandType);
      if (result) {
        return result;
      }
      try{
        this.log.debug(`Issuing command: ${commandType} for vehicle: ${this.vehicleId}`);
      } catch (error: any) {
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
      this.info = result as VehicleInfo;
      this.vehicleId = result.vehicleId;
      this.name = result.nickName;
    }
    return undefined;
  }
}