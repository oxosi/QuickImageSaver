# QuickImageSaver

A Chrome extension that lets you save images quickly with a double-click or mouse wheel (middle-button) click.

## Features

- Save images on web pages with a double-click or mouse wheel (middle-button) click
- Works the same way in the browser’s image viewer tab
- Middle-clicking a linked image (`<a href="...">`) still opens the link in a new tab
- Saves to the browser’s default download folder

## Installation (unpacked extension)

1. Clone or download this repository:
   ```
   git clone https://github.com/oxosi/QuickImageSaver.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run build
   ```

4. Open Chrome and go to `chrome://extensions`

5. Turn on **Developer mode** (top right)

6. Click **Load unpacked**

7. Select the `dist` directory inside the `QuickImageSaver` folder

8. The extension is installed and ready to use

## Usage

1. After installation, the extension icon appears in the Chrome toolbar

2. Double-click or middle-click (mouse wheel click) an image to save it to your default download folder

3. Middle-clicking a linked image opens the link in a new tab instead of saving

4. The same save gestures work in the image viewer (a tab that shows only the image)

## Development

### Prerequisites

- Node.js
- npm

### Install

```
npm install
```

### Dev server

```
npm run dev
```

### Build

```
npm run build
```

## License

This project is open source under the [MIT License](LICENSE).

## 日本語

日本語版は [README_JP.md](README_JP.md) を参照してください。
