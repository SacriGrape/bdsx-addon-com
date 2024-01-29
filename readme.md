
# BDSX/Addon Cross Communication
Plugin for communicating with an addon from BDSX!

# How to use
This plugin should either be added as a dependency or included as a standalone plugin.
### How to use inside your own addon
Inside the example addon's scripts folder is a file called `com.js`. This file is what handles the communication with BDSX. This should be included as one of the scripts in the addon. At the moment this isn't really designed to work across addons, so It's recommended to try and communicate through one of them. I intend to look into solving this once I learn more about how addons work.

### Registering an Event
Registering an event is done the same way across BDSX and Addons minus the typing of the `data` param in the `eventCallback` function
```typescript
registerEventCallback("TARGET_ID", eventCallback);  
  
function eventCallback(data: any): EventResult {  
 // Handle event
 }
```
### Triggering an event
Triggering an event uses the same params though different function names
BDSX
```typescript
let result: EventResult = await fireAddonEvent("TARGET_ID", data);
```
Addon
```javascript
let result = await fireBdsxEvent("TARGET_ID", data);
```

### Examples
There are 2 example scripts included with this plugin, they are inside the addon-com/examples folder. By default, the examples are disabled as they require an addon to fully work however I included an example addon that contains the addon side of the examples. The addon .js files are also located next to the BDSX script that gets loaded