# AttendEase

A browser extension that scrapes attendance data from the **MyAmrita** student portal and calculates how many classes you can skip or need to attend to maintain the mandatory 75% criteria :(

Forked from and improved upon [midhunann/AttendEase](https://github.com/midhunann/AttendEase)

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/adithya-menon-r/AttendEase)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](/LICENSE)

![AttendEase](https://github.com/user-attachments/assets/25b87a24-ab4c-4ab7-9326-c0e6adda50d2)

## Installation

### Chromium Based

1. Clone this repo:

   ```bash
   git clone https://github.com/adithya-menon-r/AttendEase.git
   ```
2. Go to `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the cloned folder.

### Firefox Based

1. Clone this repo:

   ```bash
   git clone https://github.com/adithya-menon-r/AttendEase.git
   ```

2. Build the `.xpi` by running the build script from the repo root:
   
   ```bash
   ./scripts/build-xpi.sh
   ```
   This generates `dist/attendease-<version>.xpi` with a Firefox-compatible manifest.

Then install it:

#### Temporary Installation
3. Go to `about:debugging#/runtime/this-firefox`.
4. Click **Load Temporary Add-on** and select the generated `.xpi`.

> **Note:** Temporary add-ons are removed when the browser restarts.

#### Permanent Installation
3. Go to `about:config` and set the `xpinstall.signatures.required` flag to `false`.
4. Go to `about:addons` → gear icon → **Install Add-on From File** → select the `.xpi`.


## License

This project is licensed under the [MIT License](./LICENSE).
