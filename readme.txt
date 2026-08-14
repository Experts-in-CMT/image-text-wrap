=== Image Text Wrap ===
Contributors: cmtkennyb
Tags: image, text wrap, float, wrap text, block
Requires at least: 6.4
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.3.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Wrap body text around an image. Float it, drop it into the copy, and choose how the text hugs it.

== Description ==

Image Text Wrap adds a Gutenberg block that flows your body text around an image the way a page-layout program does. Drop the block into a post, type your paragraphs after it, and the text reflows around the image.

You get real control over the wrap instead of the all-or-nothing float the core Image block gives you:

* **Float left or right**, with the image aligned to your content column (not thrown into the page gutter).
* **Vertical offset** slides the image down into the copy so text flows *above* it, then wraps beside and below.
* **Bounding box wrap** flows text around the image's box, with independent gaps for the text side, above, and below, like a page-layout program's box wrap.
* **Contour wrap** flows text along a circle or ellipse enclosing the image and its caption, with a single **contour offset** controlling the standoff (the gap above the image is limited by the vertical offset).
* **Top & bottom** mode drops the image into its own band with text above and below only.
* **Captions** appear below the image, edited from the sidebar, with the body text wrapping around image and caption together. They accept simple inline HTML (em, strong, links), and the standard WordPress Typography panel (font size, line height, appearance, letter spacing, letter case, decoration) styles the caption text.

The block saves as plain HTML with inline styles, so published posts keep rendering even across editor updates. There is no build step and no external dependencies.

**A note on wrapping:** text flows above, beside (one side), and below the image. Text hugging *both* sides of a centered image at once is not supported, because the browser feature required for it (CSS Exclusions) does not exist in current browsers.

== Installation ==

1. Upload the `image-text-wrap` folder to `/wp-content/plugins/`, or install the plugin through the Plugins screen in WordPress.
2. Activate the plugin through the **Plugins** screen.
3. In the post editor, add the **Image Text Wrap** block, choose an image, and type your paragraphs after it. Adjust the wrap in the block's **Text Wrap** panel.

== Frequently Asked Questions ==

= How do I get text above the image? =

Raise the **Vertical offset** slider. The text that flows above the image comes from the block placed immediately after it, so make sure a paragraph follows the image block.


= Can text wrap around all four sides of a centered image? =

No. Text flows above, below, and on one side. Simultaneous wrapping on both sides of a mid-column image requires CSS Exclusions, which no current browser supports.

= Does it work on mobile? =

Yes. Below 600px the image drops to full width with text above and below, so a narrow column never gets squeezed. Above that it keeps the float and wrap.

= Does it need a build step? =

No. The block is authored in plain JavaScript against the WordPress editor APIs, with no compile step, bundler, or external libraries.

== Screenshots ==

1. An image floated into an article with text flowing above, beside, and below it.
2. The Text Wrap panel: wrap type, position, wrap around (bounding box, contour circle, contour ellipse), vertical offset, contour offset or per-side gaps, and display width.

== Changelog ==

= 1.3.3 =
* Restored the Caption field in the block sidebar, removed by mistake in 1.3.1, and removed the in-canvas caption editing that replaced it. The caption in the canvas is a display-only preview again, now sanitized (scripts and event attributes stripped) so the 1.3.1 hardening is preserved.

= 1.3.2 =
* Blocks using the silhouette contour wrap removed in 1.2.0 (shape-outside from the image's alpha channel) now validate and migrate instead of showing "unexpected or invalid content": deprecated save formats for 1.0.0 and 1.1.x now include the contour branch, and those blocks convert to the enclosing ellipse contour, the closest modern equivalent.
* Legacy migrations now scrub generated wrap classes (has-shape, shape-*) that earlier block recoveries had captured into the block's custom class name, which would have wrongly restyled migrated blocks.

= 1.3.1 =
* Blocks published under any earlier version now upgrade cleanly: deprecated save formats for 1.0.0 through 1.3.0 are registered, so existing posts no longer show "unexpected or invalid content", and the old vertical gap's top spacing carries over into the new Gap above image setting.
* Captions are now written directly under the image in the editor canvas (like the core Image block), with bold, italics, and links via the formatting toolbar. This also hardens the caption against markup injection and against server-side filters rewriting it out from under the editor.
* The caption is read from the saved markup rather than duplicated in the block comment, so security filters (KSES, link rel rewriting) can no longer make the stored post invalid.
* Allowed the wrap's shape-outside and box-sizing styles through KSES, so authors without the unfiltered_html capability keep their wrap when saving.
* Fixed the Typography panel's line height having no effect on the caption.
* Fixed a stale Gap below image value distorting the contour geometry after switching from Bounding box to Contour mode.
* On narrow viewports the wrap box now stays inside the content column instead of overflowing it; a clamped image gets a proportionally wider standoff and never overlaps text.
* The editor script's strings are now translatable (wp_set_script_translations).
* Copy cleanup: the contour offset help now notes the gap above the image is limited by the vertical offset, and the screenshot description matches the 1.3.0 controls.

= 1.3.0 =
* Reworked text wrapping around the two wrap models used in page-layout programs: **Bounding box** (wrap to the image's box with independent per-side gaps) and **Contour** (wrap along a circle or ellipse with one uniform offset).
* Contour wrap: new **Contour offset** control, a uniform standoff between the text and the wrap contour, holding evenly all the way around the shape, including its widest point. Adjusting it never moves the image.
* Contour wrap: the contour always encloses the image and its caption, at any caption height, so the caption is never overrun and never dropped. (A perfect circle cannot enclose a caption, so with a caption the contour is the enclosing ellipse.)
* Fixed: circle and ellipse wraps were silently dropped to a rectangular wrap whenever a vertical offset or vertical gap was set, or when the image had a caption.
* Bounding box wrap: independent **Text-side gap**, **Gap above image**, and **Gap below image** controls.
* The image now stays flush with the content column on its non-text side in all wrap modes.
* Added the standard WordPress Typography panel to the block (font size, line height, appearance, letter spacing, letter case, decoration), using the theme's own presets; it styles the caption text, which stays proportionally smaller than the chosen size.

= 1.2.0 =
* Removed the contour (silhouette) wrap shape. Rectangle, circle, and ellipse wraps remain.

= 1.1.1 =
* Removed the one-time rename migration now that its purpose is complete. No functional change.

= 1.1.0 =
* Added image captions, edited from the block sidebar and shown below the image. Body text wraps around the image and caption together.
* Captions accept simple inline HTML (em, strong, a).
* One-time content migration: posts published under the plugin's former name are rewritten to the current block name, CSS class, and offset variable on update, so existing content keeps rendering and stays editable.

= 1.0.0 =
* Initial release.
* Beside-text float (left/right) with content-width alignment.
* Vertical offset (text flows above the image), vertical gap, and wrap offset controls.
* Wrap shapes: rectangle, circle, ellipse, and alpha-channel contour.
* Top & bottom (stacked) wrap mode.
* Responsive: stacks full width below 600px.

== Upgrade Notice ==

= 1.3.1 =
Adds deprecated save formats so posts published under any earlier version upgrade without block errors, moves caption editing into the canvas, and hardens the caption and wrap styles against KSES stripping. Update recommended for all users.

= 1.3.0 =
Reworks wrapping into Bounding box and Contour modes with proper per-side and contour offset controls, and fixes shapes being ignored with offsets or captions. Re-save existing Image Text Wrap blocks to pick up the corrected wrap.

= 1.2.0 =
Removes the contour (silhouette) wrap shape. Other wrap shapes are unchanged; no action needed.

= 1.1.1 =
Housekeeping release. Removes the one-time migration code; no functional change and no action needed.

= 1.1.0 =
Adds image captions. Existing content is migrated automatically on first admin load after updating; back up your database first as a precaution.

= 1.0.0 =
Initial release.
