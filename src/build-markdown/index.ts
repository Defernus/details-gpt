import { TagAttribute } from "../attribute";
import { AppError } from "../error";
import { tokenizeText } from "../tokenizer/token-parsers";
import { TagInfo } from "./tag-info";

const isTagAllowed = (
    tagsToHandle: Record<string, TagInfo>,
    tag: string,
) => Object.keys(tagsToHandle).includes(tag);

export const DETAILS_GPT_ATTRIBUTE_NAME = "data-details-gpt";

export const isExtensionElement = (element: HTMLElement) => {
    return element.getAttribute(DETAILS_GPT_ATTRIBUTE_NAME) !== null;
};

const SHOULD_TRANSFORM_TAGS = [
    "DIV",
    "OL",
    "UL",
    "LI",
    "P",
    "DETAILS",
    "SUMMARY",
];
const shouldTransformElement = (element: HTMLElement) => (
    SHOULD_TRANSFORM_TAGS.includes(element.tagName)
);

const applyAttributes = (element: HTMLElement, tagData: TagInfo, attributes: TagAttribute[]) => {
    attributes
        .filter((attr) => tagData.filterAttributes(attr))
        .forEach(({ name, value }) => {
            element.setAttribute(name, value ?? "");
        });
};

export const applyMarkdownChanges = (
    tagsToHandle: Record<string, TagInfo>,
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
        throw new AppError("Error collecting tags", { data: { data: error.data, wrapper }, cause: error });
    }

    handleNewTags(tagsToHandle, tagList);
};

const onTagCreated = (element: HTMLElement) => {
    element.setAttribute(DETAILS_GPT_ATTRIBUTE_NAME, "");
};

const handleNewTags = (
    tagsToHandle: Record<string, TagInfo>,
    tagList: TagData[],
) => {
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
            throw new AppError("tagData.startNode.textContent is undefined", { data: { tagToHandle: tagList[i] } });
        }

        if (!endNode.textContent) {
            throw new AppError("tagData.endNode.textContent is undefined", { data: { tagToHandle: tagList[i] } });
        }

        const tagData = tagsToHandle[tag.toLowerCase()];
        if (!tagData) {
            throw new AppError("Tag is not allowed", { data: { tagToHandle: tagList[i] } });
        }

        const textBeforeTag = document.createTextNode(startNode.textContent.slice(0, tagOpenStartChar));
        const textAfterTag = document.createTextNode(endNode.textContent.slice(tagCloseEndChar));

        let tagElement: HTMLElement;
        if (startNode === endNode) {
            if (nodes.length > 0) {
                throw new AppError(
                    "tagData.startNode and tagData.endNode are the same, but tagData.nodes are not empty",
                    { data: { tagToHandle: tagList[i] } },
                );
            }

            tagElement = tagData.createTag();
            onTagCreated(tagElement);

            tagElement.textContent = startNode.textContent.slice(tagOpenEndChar, tagCloseStartChar);

            startNode.replaceWith(textBeforeTag, tagElement, textAfterTag);
        } else {
            // build tag element and move all `tagData.nodes` inside it
            tagElement = tagData.createTag();
            onTagCreated(tagElement);

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
            continue;
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

const collectTagsToHandle = (tagsToHandle: Record<string, TagInfo>, wrapper: HTMLElement): TagData[] => {
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
        if (!(child instanceof Text) || !child.textContent) {
            openTags[0]?.nodes.push(child);

            return;
        }

        const tokenList = tokenizeText(child.textContent);

        for (const token of tokenList) {
            if (token.type === "code") {
                if (openTags.length === 0) {
                    result.push({
                        tag: "code",
                        attributes: [],
                        startNode: child,
                        tagOpenStartChar: token.start,
                        tagOpenEndChar: token.start + token.quote.length,
                        endNode: child,
                        tagCloseStartChar: token.end - token.quote.length,
                        tagCloseEndChar: token.end,
                        nodes: [],
                    });
                }
            } else if (token.type === "openTag") {
                if (token.isSelfClosing) {
                    throw new AppError("Self closing tags are not supported", { data: { tokenList, token, element: child } });
                }

                if (!isTagAllowed(tagsToHandle, token.tagName)) {
                    continue;
                }

                // register tag open
                openTags.push({
                    startNode: child,
                    tagOpenStartChar: token.start,
                    tagOpenEndChar: token.end,
                    tag: token.tagName,
                    attributes: token.attributes,
                    nodes: [],
                });
            } else if (token.type === "closeTag") {
                if (!isTagAllowed(tagsToHandle, token.tagName)) {
                    continue;
                }

                // register tag close
                const openTag = openTags.pop();
                if (!openTag) {
                    throw new AppError("No open tag found for closing tag", { data: { openTag, tokenList, token, child } });
                }

                if (openTag.tag !== token.tagName) {
                    throw new AppError("Mismatched tags", { data: { openTag, tokenList, token, child } });
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
                        tagCloseStartChar: token.start,
                        tagCloseEndChar: token.end,
                        attributes: openTag.attributes,
                    });
                }
            }
        }
    });

    if (openTags.length > 0) {
        throw new AppError("Unclosed tags found", { data: { unclosedTags: openTags } });
    }

    return result;
};
