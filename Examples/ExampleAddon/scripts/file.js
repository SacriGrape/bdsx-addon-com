import {system, world} from "@minecraft/server";
import {fireBdsxEvent} from "./com";

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "bdsx:read") {
        handleRead(event);
    }

    if (event.id === "bdsx:write") {
        handleWrite(event);
    }
});

function handleWrite(event) {
    let messageObject;
    try {
        messageObject = JSON.parse(event.message);
    } catch {
        throw "Message was invalid JSON for 'bdsx:write' event! Did someone try to run the command manually?"
    }

    fireBdsxEvent("WRITE", messageObject).then((result) => {
        let sender = world.getPlayers({name: result.extraData.sender})[0];

        if (!result.isSuccessful) {
            if (result.failReason !== undefined) {
                sender.sendMessage("§cError: " + result.failReason);
            } else {
                sender.sendMessage("§cFailed to write file!");
            }

            return;
        }

        sender.sendMessage("§aFile Written!");
    });
}

function handleRead(event) {
    let messageObject;
    try {
        messageObject = JSON.parse(event.message);
    } catch {
        throw "Message was invalid JSON for 'bdsx:read' event! Did someone try to run the command manually?";
    }

    fireBdsxEvent("READ", messageObject).then((result) => {
        let sender = world.getPlayers({name: result.extraData.sender})[0];

        if (!result.isSuccessful) {
            if (result.failReason !== undefined) {
                sender.sendMessage("§cError: " + result.failReason);
            } else {
                sender.sendMessage("§cFailed to read file!");
            }

            return;
        }

        sender.sendMessage("§aFile Contents:\n§e" + result.extraData.contents);
    });
}
