<?php
/**
 * Plugin Name: Image Text Wrap
 * Description: Adds an Image Text Wrap block that flows body text around an image. Float it, slide it down so text runs above it, and wrap to a box, a circle, or an ellipse.
 * Version: 1.3.1
 * Author: Kenneth Raymond
 * Requires at least: 6.4
 * Requires PHP: 7.4
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: image-text-wrap
 *
 * No build step: the editor script is authored in plain ES (global wp.* APIs),
 * registered here with explicit dependencies so load order is correct.
 *
 * @package ImageTextWrap
 */

/*
 * Image Text Wrap
 * Copyright (C) 2026 Kenneth Raymond
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'IMAGE_TEXT_WRAP_VER', '1.3.1' );

/**
 * Register scripts/styles, then the block from its block.json.
 *
 * block.json references these handles (not file: paths) so we can supply the
 * wp-* dependency array manually, which is what a no-build block needs in
 * place of the *.asset.php a build would have generated.
 */
add_action( 'init', function () {
	$dir = __DIR__ . '/block';
	$url = plugins_url( 'block', __FILE__ );

	// Version each asset by its own file mtime so edits always bust the browser
	// cache (editor script + styles). Falls back to the plugin version if the
	// file can't be stat'd.
	$ver = function ( $file ) use ( $dir ) {
		$path = $dir . '/' . $file;
		$mtime = @filemtime( $path );
		return $mtime ? (string) $mtime : IMAGE_TEXT_WRAP_VER;
	};

	wp_register_script(
		'image-text-wrap-editor',
		$url . '/index.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-data' ),
		$ver( 'index.js' ),
		true
	);

	wp_register_style(
		'image-text-wrap-style',
		$url . '/style.css',
		array(),
		$ver( 'style.css' )
	);

	wp_register_style(
		'image-text-wrap-editor-style',
		$url . '/editor.css',
		array( 'image-text-wrap-style' ),
		$ver( 'editor.css' )
	);

	wp_set_script_translations( 'image-text-wrap-editor', 'image-text-wrap' );

	register_block_type( $dir );
} );

/**
 * KSES strips inline style properties it does not know. The block's wrap is
 * built from shape-outside (and content-box sizing), so authors without
 * unfiltered_html would otherwise have the wrap silently stripped on save,
 * which also invalidates the block on the next edit.
 */
add_filter( 'safe_style_css', function ( $props ) {
	$props[] = 'shape-outside';
	$props[] = 'box-sizing';
	return $props;
} );
