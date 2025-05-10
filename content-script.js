const initExtension = () => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("dist/main.js");
    script.id = "details-gpt";

    console.log("Injecting details-gpt extension script");

    document.head.appendChild(script);
};


document.addEventListener('readystatechange', (event) => {
    if (document.readyState === "interactive") {
        initExtension();
    }
});
