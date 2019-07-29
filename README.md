This repo is in two parts:

* **src** contains the scss pre-processing and runtime modules powering variable overrides
* **app** is a React application demonstrating the variable overrides and SCSS+JSX encapsulation

#### Note: in the current state this barely supports any SCSS syntax, basically only selector nesting and variable injection

## installation

* cd into the top-level directory for this repo
* run `yarn` to install the library's npm modules
* run `yarn tsc` to compile the scss pre-processer and runtime modules
* cd into `app`
* run `yarn` to install the app's npm modules
* run `yarn webpack-dev-server` to run the application
* view the app at `http://localhost:8030`

![app preview](https://d.pr/i/DMvnxa+)