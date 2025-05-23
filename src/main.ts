import { watchMessageThread } from "./watch-message-thread";

/** Initialize **/
const run = async () => {
    if (!(window as any).detailsGpt) {
        (window as any).detailsGpt = {};
        console.info("DetailsGPT initialized");
    } else {
        console.warn("DetailsGPT already initialized")
        return;
    }

    watchMessageThread();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
} else {
    run();
}
