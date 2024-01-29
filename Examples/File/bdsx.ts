import {EventResult, registerEventCallback} from "../../index";
import {fsutil} from "bdsx/fsutil";
import isFileSync = fsutil.isFileSync;
import {readFileSync, writeFileSync} from "fs";
import {events} from "bdsx/event";
import {command} from "bdsx/command";
import {CxxString} from "bdsx/nativetype";
import {bedrockServer} from "bdsx/launcher";

registerEventCallback("READ", onReadFileEvent);
function onReadFileEvent(data: any) {
    if (data.path === undefined) {
        return EventResult.createFail("Path not provided!", {
            sender: data.sender,
        });
    } else if (!isFileSync(data.path)) {
        return EventResult.createFail("File doesn't exist at path!", {
            sender: data.sender,
        });
    }

    let fileStr = readFileSync(data.path, "utf8");

    return EventResult.createSuccess({
        sender: data.sender,
        contents: fileStr,
    });
}

registerEventCallback("WRITE", onWriteFileEvent);
function onWriteFileEvent(data: any) {
    if (data.path === undefined) {
        return EventResult.createFail("Path not provided!", {
            sender: data.sender,
        });
    } else if (data.contents === undefined) {
        data.contents = "";
    }

    writeFileSync(data.path, data.contents);

    return EventResult.createSuccess({
        sender: data.sender,
    });
}

events.serverOpen.on(() => {
    command
        .register("file", "Interact with files via the Addon API!")
        .overload((params, origin, output) => {
            bedrockServer.executeCommand(
                `/scriptevent bdsx:read {"path": "${params.path}", "sender": "${origin.getName()}"}`,
            );
            output.success("§aAsked addon to fire event!");
        }, {
            options: command.enum("options.read", "read"),
            path: CxxString,
        })
        .overload((params, origin, output) => {
            bedrockServer.executeCommand(
                `/scriptevent bdsx:write {"path": "${params.path}", "sender": "${origin.getName()}", "contents": "${params.contents}"}`
            )
        }, {
            options: command.enum("options.write", "write"),
            path: CxxString,
            contents: CxxString,
        })
})