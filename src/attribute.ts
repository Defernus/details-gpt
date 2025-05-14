import { AppError } from "./error";

export type TagAttribute = {
    name: string,
    value?: string,
};


export const parseAttributes = (attributes: string): TagAttribute[] => {
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
                throw new AppError("Failed to parse attribute value", { data: { value, attributes } });
            }
        }

        restUnparsed = restUnparsed.slice(match[0].length).trim();

        result.push({ name, value });
    }

    return result;
};
