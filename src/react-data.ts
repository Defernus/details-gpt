import { sleep } from "./utils";

const TIMEOUT = 500;
const MAX_ATTEMPTS = 500000000;
export const extractMessageContent = async (messageElement: HTMLElement, attempts = MAX_ATTEMPTS): Promise<string> => {
    let lastReason = "attempts";
    for (let i = 0; i < attempts; ++i) {
        if (!messageElement.isConnected) {
            throw new Error("Message element is not connected");
        }

        const messageInner = messageElement.firstChild?.firstChild;
        if (!messageInner) {
            console.log("No first child found", { messageElement, attempts: i });
            await sleep(TIMEOUT);
            lastReason = "firstChild";
            continue;
        }

        if (!(messageInner instanceof HTMLDivElement)) {
            console.log("First child is not a div", { messageElement, attempts: i });
            await sleep(TIMEOUT);
            lastReason = "firstChildDiv";
            continue;
        }

        if (
            messageInner.classList.contains("streaming-animation")
            || messageInner.classList.contains("result-thinking")
            || messageInner.classList.contains("result-streaming")
        ) {
            console.log("Message is still streaming", { messageElement, classes: messageInner.classList.value });
            await sleep(TIMEOUT);
            lastReason = "streaming-animation";
            continue;
        }

        const fiberData = getFiberFromDom(messageElement);

        if (!fiberData) {
            await sleep(TIMEOUT);
            lastReason = "fiberData";
            continue;
        }

        const result = fiberData?.return?.memoizedProps?.messages?.[0]?.content?.parts
            ?? [fiberData?.return?.memoizedProps.children].filter(Boolean);

        if (!result) {
            await sleep(TIMEOUT);
            lastReason = "result";
            console.log("No result found", { result, fiberData });
            continue;
        }
        if (Array.isArray(result)) {
            return result.join("\n\n---\n\n");
        }

        console.error("Result is not an array", { result, fiberData, aaa: !fiberData });
        throw new Error("Result is not an array");
    }
    console.warn("Max attempts reached", { messageElement, lastReason });
    throw new Error("Max attempts reached");
};

export const getFiberFromDom = (dom: HTMLElement): any => {
    for (const key in dom) {
        if (
            key.startsWith("__reactFiber$")
        ) {
            console.log("Found react fiber key", key);
            return (dom as any)[key];
        }
    }
    return null;
};
