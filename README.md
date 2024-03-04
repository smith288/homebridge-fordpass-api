# FordPass API Homebridge Plugin

This is a Homebridge plugin that allows you to integrate your FordPass-enabled vehicle with your Homebridge setup.

## Features

- Auto Refresh: The plugin can automatically refresh the data at a specified interval.
- Charging Switch: Adds a button that can trigger automations when your EV begins charging.
- Plug Switch: Adds a button that can trigger automations when your EV is plugged in.

## Credit
[@Brandawg93](https://github.com/Brandawg93/homebridge-fordpass) was the basis of this project.  Much of his code was reused for this one. Give them a shoutout!

## FordPass API Process

1. Sign up at FordPass API program at [developer.ford.com](https://developer.ford.com/).
2. Go to [FordConnect](https://developer.ford.com/apis/fordconnect) and request access.
3. Create Application Credentials at [https://developer.ford.com/my-developer-account/my-dashboard](https://developer.ford.com/my-developer-account/my-dashboard) and copy both Client ID and Secret 1 Hint.
  <img alt="FordPass API Application Credentials" src="https://raw.githubusercontent.com/smith288/homebridge-fordpass-api/master/media/ford-application.png"></a>
4. Construct this URL in your Browser: 

```
https://fordconnect.cv.ford.com/common/login/?make=F&application_id=[APPLICATION_ID]&client_id=[CLIENT_ID]&response_type=code&state=123&redirect_uri=https%3A%2F%2Flocalhost%3A3000&scope=access
```


## Installation

1. Install the plugin through npm:

```sh
npm install homebridge-fordpass-api
```

2. Add the platform to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "FordPass",
      "name": "Mach-e",
      "autoRefresh": true,
      "refreshRate": 60,
      "batteryName": "Battery",
      "chargingSwitch": false,
      "plugSwitch": false,
      "application_id": "<Your Application ID>",
      "client_id": "<Your Client ID>",
      "client_secret": "<Your Client Secret>",
      "code": "<Your Code>"
    }
  ]
}
```

## Configuration

The following properties are available for configuration in the `config.json`:

- `name`: The name of your vehicle.
- `autoRefresh`: If true, the plugin will automatically refresh the data.
- `refreshRate`: The number of minutes between data refreshes. This is only used if `autoRefresh` is true.
- `batteryName`: The name of the battery device.
- `chargingSwitch`: Adds a button that can trigger automations when your EV begins charging.
- `plugSwitch`: Adds a button that can trigger automations when your EV is plugged in.
- `application_id`: Enter the application ID from the FordPass API Word Document when you requested access.
- `client_id`: Enter the client ID from the FordPass API app when you requested access.
- `client_secret`: Enter the client secret from the FordPass API app when you requested access.
- `code`: Enter the code from the FordPass API app.

## Building

To build this TypeScript project, run the `build` script in the [`package.json`](command:_github.copilot.openRelativePath?%5B%22package.json%22%5D "package.json") file:

```sh
npm run build
```

## Contributing

Contributions are welcome! Please submit a pull request or create an issue to contribute.

## License

This project is licensed under the Apache-2.0 license. See the [`LICENSE`](command:_github.copilot.openRelativePath?%5B%22LICENSE%22%5D "LICENSE") file for details.
