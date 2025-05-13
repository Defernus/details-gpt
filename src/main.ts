import { applyMarkdownChanges, TagToTransformData } from "./build-markdown";
import { extractMessageContent } from "./react-data";

const TAGS_TO_HANDLE: Record<string, TagToTransformData> = {
    details: {
        createTag: () => document.createElement("details"),
        filterAttributes: (attribute) => attribute.name === "open" && !attribute.value,
    },
    summary: {
        createTag: () => document.createElement("summary"),
        filterAttributes: (_attribute) => false,
    },
    strong: {
        createTag: () => document.createElement("strong"),
        filterAttributes: (_attribute) => false,
    }
};

const transformMessage = (messageElement: Element) => {
    if (!(messageElement instanceof HTMLDivElement)) {
        throw new Error("Message element is not a div");
    }

    const isMessage = messageElement.attributes.getNamedItem("data-message-author-role")?.value === "assistant";
    if (!isMessage) {
        return;
    }

    // select div inside div
    const messageInnerElement = messageElement.firstChild?.firstChild;
    if (!messageInnerElement) {
        console.error("No div found inside the message div", messageElement);
        return;
    }

    // check if messageInnerNode is a div
    if (!(messageInnerElement instanceof HTMLDivElement)) {
        console.error("The first child of the message div is not a div", messageInnerElement);
        return;
    }

    if ((messageInnerElement as any).detailsGpt != undefined) {
        console.debug("Already transformed", messageElement);
        return;
    }

    (messageInnerElement as any).detailsGpt = {
        stage: "transformStarted",
    }

    extractMessageContent(messageElement).then(async (_message) => {
        const messageInnerElement = messageElement.firstChild?.firstChild;
        if (!(messageInnerElement instanceof HTMLDivElement)) {
            console.error("The first child of the message div is not a div", messageInnerElement);
            return;
        }

        applyMarkdownChanges(TAGS_TO_HANDLE, messageInnerElement);

        (messageInnerElement as any).detailsGpt = {
            stage: "transformDone",
        }
    }).catch((error) => {
        console.debug(
            "Error getting message content",
            error,
            { data: error.data },
            messageElement
        );
    });
};

/** Initial pass on all divs **/
const initialTransform = () => {
    document.querySelectorAll(`div[data-message-author-role="assistant"]`).forEach(transformMessage);
};

/** Observe new divs dynamically **/
const observeDivs = () => {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                    if (node instanceof HTMLDivElement) {
                        transformMessage(node);
                    }
                    node.querySelectorAll(`div[data-message-author-role="assistant"]`).forEach(transformMessage);
                }
            });

            mutation.target
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
};

/** Initialize **/
const init = () => {
    console.log("Injected script loaded");
    initialTransform();
    observeDivs();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
