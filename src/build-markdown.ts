export const buildMarkdownPart = (data: string): DocumentFragment => {
    const fragment = document.createDocumentFragment();



    return fragment;
}

export const buildMarkdown = (data: string): DocumentFragment => {
    const fragment = document.createDocumentFragment();

    const container = document.createElement("code");
    container.className = "markdown-body";
    container.innerText = data;
    fragment.appendChild(container);

    return fragment;
};

