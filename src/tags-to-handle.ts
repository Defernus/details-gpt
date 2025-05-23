import { TagInfo } from "./build-markdown/tag-info";

const createSimpleTag = (name: string): Record<string, TagInfo> => ({
    [name]: {
        createTag: () => document.createElement(name),
        filterAttributes: (_attribute) => false,
    },
});

export const TAGS_TO_HANDLE: Record<string, TagInfo> = {
    details: {
        createTag: () => document.createElement("details"),
        filterAttributes: (attribute) => attribute.name === "open" && !attribute.value,
    },
    ...createSimpleTag("summary"),
    ...createSimpleTag("strong"),
    ...createSimpleTag("code"),
    ...createSimpleTag("ul"),
    ...createSimpleTag("ol"),
    ...createSimpleTag("li"),
};
