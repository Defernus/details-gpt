# details-gpt

Browser extension to enhance ChatGPT messages rendering!

## TL;DR Usage

Make sure you have the latest version of [npm](https://www.npmjs.com/get-npm) installed.

- Clone this repo
- Run `npm install` no install deps, then `npm run watch` to start the development server. 
- Open `chrome://extensions`
- Enable developer mode and load the root folder of this repo as an unpacked extension. 
- Ask ChatGPT to use the `<details>` tag in the next message (or add [custom instruction](https://openai.com/index/custom-instructions-for-chatgpt/) to always use it)

## Custom instruction examples

```markdown
Please include expandable sections for any optional notes, advanced tips, or deeper explanations by using `<details>` and `<summary>` tags in your responses.
```

## Features

- [x] `<details>` and `<summary>` tags rendering
