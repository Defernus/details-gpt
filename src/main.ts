import { buildMarkdown } from "./build-markdown";
import { extractMessageContent } from "./react-data";

(function () {
    // Inject CSS to style details/summary
    const style = document.createElement("style");
    style.textContent = `
      details { display: block !important; margin: 0.5em 0 !important; }
      details > summary { cursor: pointer !important; user-select: none !important; }
    `;
    document.head.appendChild(style);


    const transformMessage = (messageElement: Element) => {
        if (!(messageElement instanceof HTMLDivElement)) {
            throw new Error("Message element is not a div");
        }

        const isMessage = messageElement.attributes.getNamedItem("data-message-author-role")?.value === "assistant";
        if (!isMessage) {
            return;
        }

        console.log("Transforming message", messageElement);

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

        extractMessageContent(messageElement).then(async (message) => {
            console.log("Markdown message", message);
            const element = buildMarkdown(message);

            if (!messageElement.firstChild) {
                throw new Error("No first child found in messageElement");
            }

            messageElement.firstChild.firstChild?.remove();
            console.log("Removing messageInnerElement", messageInnerElement);
            messageElement.firstChild.appendChild(element);
        }).catch((error) => {
            console.error("Error getting message content", { error, messageInnerElement });
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
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    /** Initialize **/
    const init = () => {
        console.log("Content script loaded");
        initialTransform();
        observeDivs();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
