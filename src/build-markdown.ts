export type TagToTransformData = {
    createTag: () => HTMLElement,
    /**
     * Check if the attribute is allowed
     */
    filterAttributes: (attribute: TagAttribute) => boolean,
};

const isTagAllowed = (
    tagsToHandle: Record<string, TagToTransformData>,
    tag: string,
) => Object.keys(tagsToHandle).includes(tag);

const SHOULD_TRANSFORM_TAGS = [
    "DIV",
    "OL",
    "UL",
    "LI",
    "P",
    "DETAILS",
    "SUMMARY",
];
const shouldTransformElement = (element: Element) => SHOULD_TRANSFORM_TAGS.includes(element.tagName);

const applyAttributes = (element: HTMLElement, tagData: TagToTransformData, attributes: TagAttribute[]) => {
    attributes
        .filter((attr) => tagData.filterAttributes(attr))
        .forEach(({ name, value }) => {
            element.setAttribute(name, value ?? "");
        });
};

export const applyMarkdownChanges = (
    tagsToHandle: Record<string, TagToTransformData>,
    wrapper: HTMLElement,
) => {
    if (!shouldTransformElement(wrapper)) {
        return;
    }

    wrapper.childNodes.forEach((child) => {
        if (!(child instanceof HTMLElement)) {
            return;
        }

        try {
            applyMarkdownChanges(tagsToHandle, child);
        } catch (error: any) {
            console.error("Error applying markdown changes", error, { data: error.data }, child);
        }
    });

    let tagList: TagData[];
    try {
        tagList = collectTagsToHandle(tagsToHandle, wrapper);
    } catch (error: any) {
        throw new MdError("Error collecting tags", { data: { data: error.data, wrapper }, cause: error });
    }

    for (let i = 0; i < tagList.length; ++i) {
        const {
            tag,

            startNode,
            tagOpenStartChar,
            tagOpenEndChar,

            nodes,

            endNode,
            tagCloseStartChar,
            tagCloseEndChar,

            attributes,
        } = tagList[i];

        if (!startNode.textContent) {
            throw new MdError("tagData.startNode.textContent is undefined", { data: { tagToHandle: tagList[i] } });
        }

        if (!endNode.textContent) {
            throw new MdError("tagData.endNode.textContent is undefined", { data: { tagToHandle: tagList[i] } });
        }

        const tagData = tagsToHandle[tag.toLowerCase()];
        if (!tagData) {
            throw new MdError("Tag is not allowed", { data: { tagToHandle: tagList[i] } });
        }

        const textBeforeTag = document.createTextNode(startNode.textContent.slice(0, tagOpenStartChar));
        const textAfterTag = document.createTextNode(endNode.textContent.slice(tagCloseEndChar));

        let tagElement: HTMLElement;
        if (startNode === endNode) {
            if (nodes.length > 0) {
                throw new MdError(
                    "tagData.startNode and tagData.endNode are the same, but tagData.nodes are not empty",
                    { data: { tagToHandle: tagList[i] } },
                );
            }

            tagElement = tagData.createTag();
            tagElement.textContent = startNode.textContent.slice(tagOpenEndChar, tagCloseStartChar);

            startNode.replaceWith(textBeforeTag, tagElement, textAfterTag);
        } else {
            // build tag element and move all `tagData.nodes` inside it
            tagElement = tagData.createTag();

            const textAfterTagStart = document.createTextNode(
                startNode.textContent.slice(tagOpenEndChar),
            );
            tagElement.appendChild(textAfterTagStart);

            for (const node of nodes) {
                if (node === startNode || node === endNode) {
                    continue;
                }
                tagElement.appendChild(node);
            }

            const textBeforeTagEnd = document.createTextNode(
                endNode.textContent.slice(0, tagCloseStartChar),
            );
            tagElement.appendChild(textBeforeTagEnd);

            // replace old nodes with newly created tag element
            startNode.replaceWith(textBeforeTag, tagElement);
            endNode.replaceWith(textAfterTag);
        }

        fixRestTags(tagList.slice(i + 1), endNode, textAfterTag, tagCloseEndChar);
        applyAttributes(tagElement, tagData, attributes);
        applyMarkdownChanges(tagsToHandle, tagElement);
    }
};

const fixRestTags = (tagList: TagData[], endNode: Text, newEndNode: Text, offset: number) => {
    for (const tag of tagList) {
        if (tag.startNode !== endNode) {
            return;
        }

        tag.startNode = newEndNode;

        tag.tagOpenStartChar -= offset;

        tag.tagOpenEndChar -= offset;

        if (tag.endNode === endNode) {
            tag.endNode = newEndNode;
            tag.tagCloseStartChar -= offset;
            tag.tagCloseEndChar -= offset;
        }
    }
}

type TagData = {
    startNode: Text,
    tagOpenStartChar: number,
    tagOpenEndChar: number,

    nodes: ChildNode[],

    endNode: Text,
    tagCloseStartChar: number,
    tagCloseEndChar: number,

    tag: string,

    attributes: TagAttribute[],
};

const collectTagsToHandle = (tagsToHandle: Record<string, TagToTransformData>, wrapper: HTMLElement): TagData[] => {
    const result: TagData[] = [];

    let openTags: {
        startNode: Text,
        tagOpenStartChar: number,
        tagOpenEndChar: number,
        nodes: ChildNode[],
        attributes: TagAttribute[],

        tag: string,
    }[] = [];

    wrapper.childNodes.forEach((child) => {
        let tagSearchOffset = 0;

        if (!(child instanceof Text) || !child.textContent) {
            openTags[0]?.nodes.push(child);

            return;
        }

        while (true) {
            const nextTag = getNextTag(tagSearchOffset, child.textContent);
            if (!nextTag) {
                openTags[0]?.nodes.push(child);
                break;
            }
            tagSearchOffset = nextTag.end;

            if (!isTagAllowed(tagsToHandle, nextTag.tagName)) {
                continue;
            }

            if (nextTag.isOpen) {
                // register tag open
                openTags.push({
                    startNode: child,
                    tagOpenStartChar: nextTag.start,
                    tagOpenEndChar: nextTag.end,
                    tag: nextTag.tagName,
                    attributes: nextTag.attributes,
                    nodes: [],
                });
                continue;
            }

            // register tag close
            const openTag = openTags.pop();
            if (!openTag) {
                throw new MdError("No open tag found for closing tag", { data: { openTag, nextTag, child } });
            }

            if (openTag.tag !== nextTag.tagName) {
                throw new MdError("Mismatched tags", { data: { openTag, nextTag, child } });
            }

            // NOTE: skip nested tags, they should be handled recursively
            if (openTags.length === 0) {
                result.push({
                    tag: openTag.tag,
                    startNode: openTag.startNode,
                    tagOpenStartChar: openTag.tagOpenStartChar,
                    tagOpenEndChar: openTag.tagOpenEndChar,
                    endNode: child,
                    nodes: openTag.nodes,
                    tagCloseStartChar: nextTag.start,
                    tagCloseEndChar: nextTag.end,
                    attributes: openTag.attributes,
                });
            }
        }
    });

    if (openTags.length > 0) {
        throw new MdError("Unclosed tags found", { data: openTags });
    }

    return result;
};

type TagAttribute = {
    name: string,
    value?: string,
};

type TagToken = {
    tagName: string,
    start: number,
    end: number,
    isOpen: boolean,
    attributes: TagAttribute[],
};

const getNextTag = (textOffset: number, text: string): TagToken | null => {
    const matchTag = text.slice(textOffset).match(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(\s+[^>]*)?>/);

    if (!matchTag) {
        return null;
    }

    if (matchTag.index === undefined) {
        throw new MdError("matchTag.index is undefined");
    }

    const tagName = matchTag[2];
    const isOpen = matchTag[1] === "";
    const tagStart = textOffset + matchTag.index;
    const tagEnd = tagStart + matchTag[0].length;

    return {
        tagName,
        start: tagStart,
        end: tagEnd,
        isOpen,
        attributes: matchTag[3] ? parseAttributes(matchTag[3]) : [],
    };
};

const parseAttributes = (attributes: string): TagAttribute[] => {
    const result: { name: string, value?: string }[] = [];

    let restUnparsed = attributes.trim();

    while (restUnparsed.length > 0) {
        const match = restUnparsed.match(/^([a-zA-Z][a-zA-Z0-9-]*)(\s*=\s*("[^"]*"|'[^']*'|[^\s>]*))?/);
        if (!match) {
            return result;
        }

        const name = match[1];
        let value = match[3];
        if (value) {
            try {
                value = JSON.parse(value);
            }
            catch (e) {
                throw new MdError("Failed to parse attribute value", { data: { value, attributes } });
            }
        }

        restUnparsed = restUnparsed.slice(match[0].length).trim();

        result.push({ name, value });
    }

    return result;
};


export class MdError extends Error {
    data?: any;

    constructor(message: string, options: { data?: any, cause?: unknown } = {}) {
        super(message, { cause: options.cause });
        this.name = "MdError";
        this.data = options.data;

    }
}
