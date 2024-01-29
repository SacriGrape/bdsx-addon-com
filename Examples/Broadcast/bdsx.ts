import {EventResult, fireAddonEvent, registerEventCallback} from "../../index";
import {bedrockServer} from "bdsx/launcher";
import {events} from "bdsx/event";
import {command} from "bdsx/command";
import {CxxString} from "bdsx/nativetype";

// Broadcast using the BDSX API
registerEventCallback("BROADCAST", onBroadcastRequest);
function onBroadcastRequest(data: any) {
    if (data.message === undefined || typeof data.message !== "string") {
        return EventResult.createFail("Message not provided!");
    }

    const players = bedrockServer.level.getPlayers();
    for (const player of players) {
        player.sendMessage(data.message);
    }

    return EventResult.createSuccess();
}

events.serverOpen.on(() => {
    command
        .register("broadcast", "Broadcasts a message via the Addon API or the BDSX API")
        .overload((params, _o, output) => {
            // Calls the Addon API to broadcast a message
            fireAddonEvent("BROADCAST", {message: params.message}).then((result) => {
                if (!result.isSuccessful) {
                    throw result.failReason;
                }
            });

            output.success("§aEvent fired!");
        }, {
            options: command.enum("options.addon", "addon"),
            message: CxxString,
        })
        .overload((params, _o, output) => {
            // Calls the BDSX API from an Addon to broadcast a message
            let command = `/scriptevent bdsx:broadcast ${params.message}`;
            bedrockServer.executeCommand(command);

            output.success("§aAsked addon to fire event!");
        }, {
            options: command.enum("options.bdsx", "bdsx"),
            message: CxxString
        })
})