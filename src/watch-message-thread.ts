import { applyMarkdownChanges, isExtensionElement } from "./build-markdown";
import { TAGS_TO_HANDLE } from "./tags-to-handle";

const isMdElement = (el: Element): el is HTMLDivElement => {
    return el instanceof HTMLDivElement && el.classList.contains("markdown");
};



const findParentMarkdownElement = (el: Element): HTMLDivElement | null => {
    let currentElement = el.parentElement;
    while (currentElement) {
        if (isMdElement(currentElement)) {
            return currentElement;
        }
        currentElement = currentElement.parentElement;
    }

    return null;
};

const walkChildrenMdElements = (element: HTMLElement, callback: (el: HTMLDivElement) => void) => {
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isMdElement(child)) {
            callback(child);
        } else if (child instanceof HTMLElement) {
            walkChildrenMdElements(child, callback);
        }
    }
}

const onElementChanged = (element: HTMLElement) => {
    if (isExtensionElement(element)) {
        return;
    }

    if (isMdElement(element)) {
        applyMarkdownChanges(TAGS_TO_HANDLE, element);
        return;
    }

    const mdElement = findParentMarkdownElement(element);
    if (mdElement) {
        applyMarkdownChanges(TAGS_TO_HANDLE, mdElement);
    }

    walkChildrenMdElements(element, (element) => {
        applyMarkdownChanges(TAGS_TO_HANDLE, element);
    });
};

const onAttributeChanged = (
    element: HTMLElement,
    attributeName: string | null,
    oldValue: string | null,
) => {
    if (!isMdElement(element)) {
        return;
    }

    // apply changes only if markdown class just added
    if (attributeName === "class" && !oldValue?.includes("markdown")) {
        applyMarkdownChanges(TAGS_TO_HANDLE, element);
    }
};

const onMutation = (mutation: MutationRecord) => {
    if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
                try {
                    onElementChanged(node);
                } catch (error: any) {
                    console.error("Error applying markdown changes", { error, node });
                }
            }
        });
    } else if (mutation.type === "characterData") {
        if (mutation.target instanceof HTMLElement) {
            try {
                onElementChanged(mutation.target);
            } catch (error: any) {
                console.error("Error applying markdown changes", { error, mutation });
            }
        }
    } else if (mutation.type === "attributes") {
        try {
            onAttributeChanged(
                mutation.target as HTMLElement,
                mutation.attributeName,
                mutation.oldValue,
            );
        } catch (error: any) {
            console.error("Error applying markdown changes", { error, mutation });
        }
    }
};

export const watchMessageThread = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(onMutation);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
    });
};
