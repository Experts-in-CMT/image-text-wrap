# Image Text Wrap

A WordPress block that wraps body text around an image the way a page-layout program does. Float it, drop it into the copy so text flows above it, and choose how the words hug the edge, right down to the cut-out shape of a transparent PNG.

No build step, no dependencies, static-save output.

## Features

- **Float left or right**, aligned to the content column (not dumped in the page gutter).
- **Vertical offset:** slide the image down into the copy so text flows *above* it, then wraps beside and below.
- **Wrap offset:** the gap between the image and the text on the wrapping side.
- **Vertical gap:** breathing room above and below the image.
- **Wrap shape:** text hugs a box, a circle, an ellipse, or the real silhouette of a transparent PNG (CSS `shape-outside`).
- **Top & bottom:** drop the image into its own band, text above and below only.
- **Captions:** add a caption below the image, edited from the sidebar; body text wraps around the image and its caption together. Accepts simple inline HTML (`<em>`, `<strong>`, `<a>`).
- **Responsive:** stacks full width below 600px so narrow columns never get squeezed.
- **Durable:** saves as plain HTML with inline styles, so published posts keep rendering across editor updates.

## Installation

Copy the `image-text-wrap` folder into `wp-content/plugins/` and activate it from the Plugins screen.

Requires WordPress 6.4+ and PHP 7.4+.

## Usage

1. Add the **Image Text Wrap** block to a post and choose an image.
2. Type your paragraphs *after* the block. That text is what wraps around the image.
3. Shape the wrap in the block's **Text Wrap** panel (position, vertical offset, vertical gap, wrap offset, shape, display width).
4. Optionally add a **caption** in the sidebar Caption box. It sits below the image, the body text wraps around both, and it accepts simple inline HTML (`<em>`, `<strong>`, `<a>`).

## Notes and limitations

- **Text above the image** comes from the block immediately following the image, so keep a paragraph after it.
- **Contour (silhouette) wrap** reads the image's alpha channel, so it needs a transparent PNG/WebP served from the same site. Opaque images fall back to a rectangle.
- **Four-sided wrap** (text hugging both sides of a centered image at once) is not supported. It needs CSS Exclusions, which no current browser ships, so text flows above, below, and on one side.

## Development

The block is written in plain JavaScript against the global `wp.*` editor APIs, with no JSX, bundler, or compile step. Edit the files under `block/` directly:

- `block/block.json`: block metadata and attributes
- `block/index.js`: editor UI and static `save()`
- `block/style.css`: front-end and shared styles
- `block/editor.css`: editor-only tweaks

Assets are versioned by file mtime, so edits bust the browser cache automatically.

## License

Licensed under [GPL-2.0-or-later](LICENSE).
