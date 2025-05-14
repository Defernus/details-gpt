import { TagAttribute } from "../attribute";

export type TagInfo = {
    createTag: () => HTMLElement,
    /**
     * Check if the attribute is allowed
     */
    filterAttributes: (attribute: TagAttribute) => boolean,
};
