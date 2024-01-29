# Example Info Readme
## IMPORTANT NOTE
For this communication system to work the `@minecraft-server-net`

## Brief explanation of how to enable examples
The examples include two parts, `bdsx.ts/js` and `file.js`
`file.js` is the code that would be used in an addon script and the bdsx files are the ones the BDSX side uses.

### Addons
The addon files are intended to be in the same folder as the `com.js` file and should be imported by the entry point for the module that imports `com.js`

### BDSX
The BDSX files are expected to be run by importing the `examples/index.ts` file inside the plugins entry `index.ts` file. You can either do this by adding your own import line or uncommenting the import line at the bottom of the `index.ts` file

## What the examples contain
### Broadcast Example:
* Broadcasts a message to every player using either the BDSX API or the Addon API
* Simple "Hello World!" style example, showcases basic functions
* 1 Event for BDSX -> Addon and 1 Event for Addon -> BDSX
    * Addon -> BDSX triggered by running `/broadcast bdsx <message>`
    * BDSX -> Addon triggered by running `/broadcast addon <message>`
### File API Example
* Gives addons the ability to do asynchronous file writing
* Potentially useful use case for this communication plugin
* 2 Events for Addon -> BDSX
    * Write to a file with `/file write <path> <content>`
    * Read a file as `utf-8` with `/file read <path>`
* Paths should be relative to BDSX's `bedrock_server` folder or absolute