# FordPass API Homebridge Plugin

This is a Homebridge plugin that allows you to integrate your FordPass-enabled vehicle with your Homebridge setup.

## Features

- Auto Refresh: The plugin can automatically refresh the data at a specified interval.
- Charging Switch: Adds a button that can trigger automations when your EV begins charging.
- Plug Switch: Adds a button that can trigger automations when your EV is plugged in.

## Credit
[@Brandawg93](https://github.com/Brandawg93/homebridge-fordpass) was the basis of this project.  Much of his code was reused for this one. Give them a shoutout!

## FordPass API Process

1. First, you MUST have a FordPass account. If you don't, you will need to do that first and that's outside of the scope for these instructions. [Start here](https://www.ford.com/support/how-tos/fordpass/getting-started-with-fordpass/download-fordpass/)
2. Sign up at FordPass API program at [developer.ford.com](https://developer.ford.com/).
3. Go to [FordConnect](https://developer.ford.com/apis/fordconnect) and request access.
4. Create Application Credentials at [https://developer.ford.com/my-developer-account/my-dashboard](https://developer.ford.com/my-developer-account/my-dashboard) and copy Secret 1 Hint.
  <img alt="FordPass API Application Credentials" src="https://raw.githubusercontent.com/smith288/homebridge-fordpass-api/master/media/ford-application.png">
5. Construct this URL in your Browser: 

```
https://fordconnect.cv.ford.com/common/login/?make=F&application_id=AFDC085B-377A-4351-B23E-5E1D35FB3700&client_id=30990062-9618-40e1-a27b-7c6bcb23658a&response_type=code&state=123&redirect_uri=https%3A%2F%2Flocalhost%3A3000&scope=access
```
6. Sign in with your FordPass login that you use for FordPass' app. 
7. Select the car you wish to integrate with.
8. Click Authorize
9. The page will eventually send you to an invalid page.  This is normal. Copy the URL into a notepad, delete everything from the beginning until after code=
  <img alt="FordPass API Application Credentials" src="https://raw.githubusercontent.com/smith288/homebridge-fordpass-api/master/media/ford-authorize.png">

10. Take the remaining text and copy it for the FordPass Plugin config.
11. Same goes for the Client Secret.

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
