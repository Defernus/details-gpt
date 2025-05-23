export const MESSAGE_THREAD_ID = "thread";
export const findMessagesThreadElement = (): HTMLElement | null => (
    document.getElementById(MESSAGE_THREAD_ID)
);

export const getMessagesContainer = (messageThread: HTMLElement): HTMLElement | null => {
    const container = (
        messageThread.children[0]
            ?.children[1]
            ?.children[0]
            ?.children[0]
            ?.children[1] ?? null
    ) as Element | null;

    if (container instanceof HTMLElement) {
        return container;
    }

    if (container !== null) {
        console.error("Expected messages container to be an HTMLElement, but got:", container);
    }

    return null;
};
