=== Image Text Wrap ===
Contributors: cmtkennyb
Tags: image, text wrap, float, wrap text, block
Requires at least: 6.4
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Wrap body text around an image. Float it, drop it into the copy, and choose how the text hugs it, right down to a PNG's cut-out shape.

== Description ==

Image Text Wrap adds a Gutenberg block that flows your body text around an image the way a page-layout program does. Drop the block into a post, type your paragraphs after it, and the text reflows around the image.

You get real control over the wrap instead of the all-or-nothing float the core Image block gives you:

* **Float left or right**, with the image aligned to your content column (not thrown into the page gutter).
* **Vertical offset** slides the image down into the copy so text flows *above* it, then wraps beside and below.
* **Wrap offset** sets the gap between the image and the text on the wrapping side.
* **Vertical gap** adds breathing room above and below the image.
* **Wrap shape** lets the text hug a plain box, a circle, an ellipse, or the actual silhouette of a transparent PNG (via CSS `shape-outside`).
* **Top & bottom** mode drops the image into its own band with text above and below only.

The block saves as plain HTML with inline styles, so published posts keep rendering even across editor updates. There is no build step and no external dependencies.

**A note on wrapping:** text flows above, beside (one side), and below the image. Text hugging *both* sides of a centered image at once is not supported, because the browser feature required for it (CSS Exclusions) does not exist in current browsers.

== Installation ==

1. Upload the `image-text-wrap` folder to `/wp-content/plugins/`, or install the plugin through the Plugins screen in WordPress.
2. Activate the plugin through the **Plugins** screen.
3. In the post editor, add the **Image Text Wrap** block, choose an image, and type your paragraphs after it. Adjust the wrap in the block's **Text Wrap** panel.

== Frequently Asked Questions ==

= How do I get text above the image? =

Raise the **Vertical offset** slider. The text that flows above the image comes from the block placed immediately after it, so make sure a paragraph follows the image block.

= The contour (silhouette) wrap isn't following my image. Why? =

Contour wrap reads the image's transparency. It only works with a transparent PNG or WebP served from your own site. A JPG or an opaque image has no silhouette to follow, so it falls back to a rectangle.

= Can text wrap around all four sides of a centered image? =

No. Text flows above, below, and on one side. Simultaneous wrapping on both sides of a mid-column image requires CSS Exclusions, which no current browser supports.

= Does it work on mobile? =

Yes. Below 600px the image drops to full width with text above and below, so a narrow column never gets squeezed. Above that it keeps the float and wrap.

= Does it need a build step? =

No. The block is authored in plain JavaScript against the WordPress editor APIs, with no compile step, bundler, or external libraries.

== Screenshots ==

1. An image floated into an article with text flowing above, beside, and below it.
2. The Text Wrap panel: wrap type, position, vertical offset, vertical gap, wrap offset, shape, and display width.
3. Contour wrap following the silhouette of a transparent PNG.

== Changelog ==

= 1.0.0 =
* Initial release.
* Beside-text float (left/right) with content-width alignment.
* Vertical offset (text flows above the image), vertical gap, and wrap offset controls.
* Wrap shapes: rectangle, circle, ellipse, and alpha-channel contour.
* Top & bottom (stacked) wrap mode.
* Responsive: stacks full width below 600px.

== Upgrade Notice ==

= 1.0.0 =
Initial release.
