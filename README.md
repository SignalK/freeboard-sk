# Freeboard

This is a port of Freeboard (http://www.42.co.nz/freeboard) to use the Signal K communication protocols and utilise Signal K server features.

## Development:

This is an Angular project generated with [Angular CLI](https://github.com/angular/angular-cli).

1. Clone this repository - the angular project resides in the **/source** folder.

From the **/source** folder:

2. Run: `npm install` *(to install Angular CLI and project dependencies)*

3. Run `ng serve` to start a develeopment web server and navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

**Note:** The served application will look to connect to Signal K server at the ip address defined in the `DEVHOST` property in the `src/app.info.ts` file.


## Build:

#### NPM package

To build the NPM package source use the `ng build --prod` command from within the project folder.

Built package suitable for use with `npm publish` is placed in the `/dist/freeboard` folder which contains the application files for deployment.
