const initExtension = () => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("dist/main.js");
    script.id = "details-gpt";

    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = chrome.runtime.getURL("static/injected-styles.css");
    style.id = "details-gpt-styles";

    console.log("Injecting details-gpt extension script and styles");

    document.head.appendChild(script);
    document.head.appendChild(style);
};


document.addEventListener('readystatechange', (event) => {
    if (document.readyState === "interactive") {
        initExtension();
    }
});
