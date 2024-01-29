import * as http from "http";
import {bedrockServer} from "bdsx/launcher";
import {events} from "bdsx/event";

let port = 4843;

let responseDatas: Map<string, EventResult> = new Map(); // Key: requestId, Value: response data

let cachedSessionId: string | undefined = undefined;

function getSessionId(existingId?: string): string {
    if (cachedSessionId !== undefined) {
        return cachedSessionId;
    } else if (existingId === undefined) {
        cachedSessionId = generateRandomId();
        return cachedSessionId;
    }

    cachedSessionId = existingId;
    return cachedSessionId;
}

function isValidSessionId(sessionId: string) {
    let cachedId = getSessionId(sessionId);
    if (cachedId === undefined) {
        cachedSessionId = sessionId;
        cachedId = sessionId;
    }

    return cachedId === sessionId;
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

let httpServer = http.createServer((req, res) => {
    let requestStr = '';

    req.on('data', chunk => {
        requestStr += chunk;
    })

    req.on('end', () => {
        if (req.url === undefined) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end("");
            return;
        }

        if (req.url === "/addon/response/") {
            let response = ComResponse.fromString(requestStr);

            if (response === undefined || !EventResult.isValid(response.data)) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end(""); // Since this is already a response, it would be weird to send another thing back
                console.warn("Got invalid data at the /addon/response endpoint!");
                return; // Most likely a result of someone trying to hit the end point directly
            }

            responseDatas.set(response.requestId, EventResult.fromData(response.data));

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end("");
        } else if (req.url === "/addon/request/") {
            let request = ComRequest.fromString(requestStr);

            if (request === undefined) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end(""); // Not responding with data since it's an invalid request
                return; // Most likely result of someone trying to hit the point directly
            }

            let eventCallback = eventCallbacks.get(request.targetId);
            if (eventCallback === undefined) {
                let failResult = EventResult.createFail("TargetID doesn't exist");
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end(JSON.stringify(failResult));
                return;
            }

            if (request.data === undefined) {
                request.data = {};
            }
            let result = eventCallback(request.data);

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(JSON.stringify(result));
            return;
        }
    })
});

httpServer.listen(port, () => {
    console.log(`Addon communication server running at http://127.0.0.1:${port}/`);
})

events.serverClose.on(() => {
    httpServer.close();
})

class ComRequest {
    sessionId: string;
    targetId: string;
    requestId: string;
    data: any;

    constructor(targetId: string, requestId: string, data: any) {
        this.sessionId = getSessionId();
        this.targetId = targetId;
        this.requestId = requestId;
        this.data = data;
    }

    static fromString(str: string) {
        let data = JSON.parse(str);
        if (!ComRequest.isValid(data)) {
            return undefined;
        }

        return new ComRequest(data.targetId, data.requestId, data.data);
    }

    static isValid(request: any) {
        const dataKeys = Object.keys(request);

        return dataKeys.includes("targetId") &&
            dataKeys.includes("requestId") &&
            dataKeys.includes("sessionId") &&
            isValidSessionId(request.sessionId);
    }

    static async createAndSend(targetId: string, data: any): Promise<EventResult> {
        let requestId = generateRandomId();
        let request = new ComRequest(targetId, requestId, data);

        bedrockServer.executeCommand(`/scriptevent bdsx:sendInfo ${JSON.stringify(request)}`);

        return new Promise((res) => {
            let intervalTimeout = setInterval(() => {
                let responseData = responseDatas.get(requestId);

                if (responseData !== undefined) {
                    clearInterval(intervalTimeout);
                    res(responseData);
                }
            }, 10)
        })
    }
}

class ComResponse {
    sessionId: string;
    requestId: string;
    data: EventResult;

    constructor(requestId: string, data: EventResult) {
        this.sessionId = getSessionId();
        this.requestId = requestId;
        this.data = data;
    }

    static fromString(str: string) {
        let data = JSON.parse(str);
        if (!ComResponse.isValid(data)) {
            return undefined;
        }

        data.data = EventResult.fromData(data.data);

        return new ComResponse(data.requestId, data.data);
    }

    static isValid(response: any) {
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
}
// Event Registry/exported items
export type EventFunc = (data: any) => EventResult;
const eventCallbacks: Map<string, EventFunc> = new Map();


export class EventResult {
    isSuccessful: boolean;
    extraData: any;
    failReason: string | undefined; // Required if result is a fail

    constructor(isSuccessful: boolean, extraData: any, failReason?: string) {
        this.isSuccessful = isSuccessful;
        this.extraData = extraData;
        this.failReason = failReason;
    }

    static createFail(failReason: string, extraData?: any) {
        return new EventResult(false, extraData, failReason);
    }

    static createSuccess(extraData?: any) {
        return new EventResult(true, extraData);
    }

    static isValid(result: any): result is EventResult {
        if (result.isSuccessful === undefined) {
            return false;
        } else if (!result.isSuccessful) {
            return result.failReason !== undefined;
        }

        return true;
    }

    static fromData(data: any) {
        return new EventResult(data.isSuccessful, data.extraData, data.failReason);
    }
}

export async function fireAddonEvent(targetId: string, data: any): Promise<EventResult> {
    return ComRequest.createAndSend(targetId, data);
}

export function registerEventCallback(targetId: string, callback: EventFunc) {
    let cachedCallback = eventCallbacks.get(targetId);
    if (cachedCallback !== undefined) {
        throw `Event callback with targetID ${targetId} already exists`;
    }

    eventCallbacks.set(targetId, callback);
}

// Remove comment to enable test scripts!
import './Examples/index';