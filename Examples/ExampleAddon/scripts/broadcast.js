import {EventResult, fireBdsxEvent, registerEventCallback} from './com';
import {system, world} from "@minecraft/server";

registerEventCallback("BROADCAST", onBroadcastRequest);
function onBroadcastRequest(data) {
    if (data.message === undefined || typeof data.message !== 'string') {
        return EventResult.createFail("No message provided!");
    }

    world.sendMessage(data.message);

    return EventResult.createSuccess();
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "bdsx:broadcast") {
        return;
    }

    fireBdsxEvent("BROADCAST", {message: event.message}).then((result) => {
        if (!result.isSuccessful) {
            throw "Event failed!";
        }
    });
});