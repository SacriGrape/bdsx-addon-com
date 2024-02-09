import {system} from "@minecraft/server";
import {http, HttpHeader, HttpRequest, HttpRequestMethod} from "@minecraft/server-net";

// You also need to update the port in @bdsx/addon-com/index.ts if you change it
const url = "http://127.0.0.1:4843/";

let cachedSessionId;

function getSessionId(existingId) {
    if (cachedSessionId === undefined) {
        if (existingId !== undefined) {
            cachedSessionId = existingId;
        } else {
            cachedSessionId = generateRandomId();
        }
    }

    return cachedSessionId;
}

function isValidSessionId(id) {
    return getSessionId(id) === id;
}

function generateRandomId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomId = '';

    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomId += characters.charAt(randomIndex);
    }

    return randomId;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "bdsx:sendInfo") {
        return;
    }

    let messageData;
    try {
        messageData = ComRequest.fromString(event.message);
    } catch {
        return; // Can't return fail result since no RequestID can be harvested from the message. BDSX will time out, though usually caused by someone manually messing with the command
    }

    if (messageData === undefined) {
        console.warn("Invalid message data sent through scriptevent! Did someone run the command manually?");
        return;
    }

    let eventCallback = eventCallbacks.get(messageData.targetId);
    if (eventCallback === undefined) {
        let failResult = EventResult.createFail(
            `Couldn't find target id ${messageData.targetId}`,
        );

        sendEventResult(failResult, messageData.requestId).then();
    }

    if (messageData.data === undefined) {
        messageData.data = {};
    }
    let result = eventCallback(messageData.data);
    sendEventResult(result, messageData.requestId).then();
});

class ComRequest {
    sessionId;
    targetId;
    requestId;
    data;

    constructor(targetId, requestId, data) {
        this.sessionId = getSessionId();
        this.targetId = targetId;
        this.requestId = requestId;
        this.data = data;
    }

    static isValid(request) {
        const dataKeys = Object.keys(request);

        return dataKeys.includes("targetId") &&
            dataKeys.includes("requestId") &&
            dataKeys.includes("sessionId") &&
            isValidSessionId(request.sessionId);
    }

    static fromString(str) {
        let data = JSON.parse(str);
        if (!ComRequest.isValid(data)) {
            console.warn("Invalid ComRequest data! Did someone run /scriptevent manually?");
            return undefined;
        }

        return new ComRequest(data.targetId, data.requestId, data.data);
    }

    static async createAndSend(targetId, data) { // Returns Promise<EventResult>
        let requestId = generateRandomId();
        let request = new ComRequest(targetId, requestId, data);

        return request.send();
    }

    async send() { // Returns Promise<EventResult>
        let request = new HttpRequest(url + "addon/request/");
        request.body = JSON.stringify(this);
        request.method = HttpRequestMethod.Put;
        request.headers = [
            new HttpHeader("Content-Type", "application/json"),
        ];

        let result = await http.request(request);
        let eventResultData = JSON.parse(result.body);
        let eventResult = EventResult.fromData(eventResultData);
        if (eventResult === undefined) {
            throw `Event result sent from BDSX invalid for target ID: ${this.targetId}!`;
        }

        return eventResult;
    }
}

class ComResponse {
    sessionId;
    requestId;
    data;

    constructor(requestId, data) {
        this.sessionId = getSessionId(); // A response will always follow a request so ID has to have been set
        this.requestId = requestId;
        this.data = data;
    }

    static fromString(str) {
        let data;
        try {
            data = JSON.parse(str);
        } catch {
            return undefined;
        }

        if (!ComResponse.isValid(data)) {
            return undefined;
        }

        return new ComResponse(data.requestId, data.data);
    }

    static async createAndSend(requestId, data) {
        let response = new ComResponse(requestId, data);
        let httpResponse = await response.send();
        return ComResponse.fromString(httpResponse.body);
    }

    static isValid(response) {
        const dataKeys = Object.keys(response);
        if (dataKeys.length !== 3) {
            return false;
        }

        for (const key of dataKeys) {
            if (
                key !== "sessionId" &&
                key !== "requestId" &&
                key !== "data"
            ) {
                return false;
            }
        }

        return isValidSessionId(response.sessionId);
    }

    async send() {
        let request = new HttpRequest(url + "addon/response/");
        request.body = JSON.stringify(this);
        request.method = HttpRequestMethod.Put;
        request.headers = [
            new HttpHeader("Content-Type", "application/json"),
        ];

        return http.request(request);
    }
}

export class EventResult {
    isSuccessful; // Boolean
    extraData; // Any
    failReason; // String | Undefined

    constructor(isSuccessful, extraData, failReason) {
        this.isSuccessful = isSuccessful;
        this.extraData = extraData;
        this.failReason = failReason;
    }

    static createFail(failReason, data) {
        return new EventResult(false, data, failReason);
    }

    static createSuccess(data) {
        return new EventResult(true, data);
    }

    static isValid(result) {
        if (result.isSuccessful === undefined) {
            return false;
        } else if (result.isSuccessful === false) {
            return result.failReason !== undefined;
        }

        return true;
    }

    static fromData(data) {
        if (!this.isValid(data)) {
            return undefined;
        }

        return new EventResult(data.isSuccessful, data.extraData, data.failReason);
    }
}

async function sendEventResult(result, requestId) {
    if (!EventResult.isValid(result)) {
        throw "Event result invalid!";
    }

    return ComResponse.createAndSend(requestId, result);
}

// Event Registering and Exports
const eventCallbacks = new Map; // Key: TargetID, Value: (data: any) => EventResult

export function registerEventCallback(targetId, callback) {
    let cachedCallback = eventCallbacks.get(targetId);

    if (cachedCallback !== undefined) {
        throw `Event listener with ID ${targetId} already exists`;
    }

    eventCallbacks.set(targetId, callback);
}

export async function fireBdsxEvent(targetId, data) { // Returns Promise<EventResult>
    return ComRequest.createAndSend(targetId, data);
}