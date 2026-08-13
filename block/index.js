/**
 * Image Text Wrap — editor registration (no-build, global wp.* APIs).
 *
 * Static-save block: save() emits plain <figure><img></figure> HTML with the
 * float / shape-outside baked into inline styles + classes. Nothing renders on
 * the server, so already-published posts survive any future editor breakage.
 */
( function ( blocks, element, blockEditor, components, i18n ) {
	'use strict';

	var el = element.createElement;
	var Fragment = element.Fragment;
	var RawHTML = element.RawHTML;
	var __ = i18n.__;

	var useBlockProps = blockEditor.useBlockProps;
	var InspectorControls = blockEditor.InspectorControls;
	var MediaUpload = blockEditor.MediaUpload;
	var MediaUploadCheck = blockEditor.MediaUploadCheck;
	var MediaPlaceholder = blockEditor.MediaPlaceholder;

	var PanelBody = components.PanelBody;
	var SelectControl = components.SelectControl;
	var RangeControl = components.RangeControl;
	var TextareaControl = components.TextareaControl;
	var Button = components.Button;
	var Notice = components.Notice;

	/**
	 * Build the figure's className + inline style from attributes.
	 * Used by BOTH edit preview and save so they can never diverge.
	 */
	function figureProps( attrs ) {
		var mode = attrs.wrapMode === 'stack' ? 'stack' : 'beside';
		var shape = attrs.shape || 'rectangle'; if ( shape !== 'circle' && shape !== 'ellipse' ) { shape = 'rectangle'; }
		var offset = typeof attrs.offset === 'number' ? attrs.offset : 16;
		var offsetY = typeof attrs.offsetY === 'number' ? attrs.offsetY : 0;
		var gapY = typeof attrs.gapY === 'number' ? attrs.gapY : 0;
		var width = typeof attrs.width === 'number' ? attrs.width : 300;
		var hasCaption = !! ( attrs.caption && attrs.caption.length );

		// Beside (float) only supports left/right; stacked adds center.
		var side = attrs.side;
		if ( mode === 'beside' ) {
			side = side === 'right' ? 'right' : 'left';
		} else {
			side = ( side === 'right' || side === 'center' ) ? side : 'left';
		}

		// Beside mode keeps its original class list (no wrap-* marker) so blocks
		// published before top/bottom existed stay valid and keep floating.
		// Only stacked mode adds a wrap-stack marker.
		var classes = [ 'image-text-wrap' ];
		if ( mode === 'stack' ) {
			classes.push( 'wrap-stack' );
		}
		classes.push( 'align-' + side );

		var style = {
			width: width + 'px',
			'--image-text-wrap-offset': offset + 'px'
		};

		// Shape logic only applies when text runs beside the image.
		if ( mode === 'beside' ) {
			// The inset path handles vertical offset (text above) and/or a
			// vertical gap (top+bottom breathing room). Either one switches to a
			// deterministic rectangular wrap built from padding + shape-outside.
			var useInset = offsetY > 0 || gapY > 0;

			if ( useInset ) {
				// All gaps are REAL padding; shape-outside spans the whole padded
				// box so text avoids it — deterministic, no shape-margin reliance.
				// content-box keeps `width` equal to the image width.
				//
				//   padding-top    = offsetY  (drops the image; text flows above)
				//   padding-bottom = gapY     (space below image before text resumes)
				//   padding side   = offset   (text-side gap)
				//   shape top inset= offsetY - gapY  (lifts the wrap gapY above the
				//                    image top so the top gap matches the bottom)
				// Rectangular wrap; shape presets apply only when both are 0.
				classes.push( 'shape-rectangle' );
				classes.push( 'has-shape' );
				style.boxSizing = 'content-box';

				if ( offsetY > 0 ) {
					style.paddingTop = offsetY + 'px';
				}
				if ( gapY > 0 ) {
					style.paddingBottom = gapY + 'px';
				}
				if ( side === 'right' ) {
					style.paddingLeft = offset + 'px';
				} else {
					style.paddingRight = offset + 'px';
				}
				style.marginBottom = '0';

				// Top gap can't exceed the vertical offset (no room above the
				// image beyond where it was pushed down), so clamp at 0.
				var insetTop = Math.max( 0, offsetY - gapY );
				style.shapeOutside = 'inset(' + insetTop + 'px 0px 0px 0px)';
			} else {
				// Offset 0: original per-shape behavior. Markup is unchanged from
				// before offsetY existed, so older blocks stay valid.
				//
				// A caption sits below the image inside the figure. The non-rectangular
				// shapes only carve the image, so text would overlap the caption band.
				// When a caption is present, fall back to a rectangular (bounding-box)
				// wrap that includes the caption.
				var effectiveShape = ( hasCaption && shape !== 'rectangle' ) ? 'rectangle' : shape;
				classes.push( 'shape-' + effectiveShape );
				if ( effectiveShape !== 'rectangle' ) {
					classes.push( 'has-shape' );
				}

				if ( effectiveShape === 'circle' ) {
					style.shapeOutside = 'circle(50%)';
					style.shapeMargin = offset + 'px';
				} else if ( effectiveShape === 'ellipse' ) {
					style.shapeOutside = 'ellipse(50% 50%)';
					style.shapeMargin = offset + 'px';
				}
			}
		}

		return { className: classes.join( ' ' ), style: style };
	}

	function Edit( props ) {
		var attrs = props.attributes;
		var setAttributes = props.setAttributes;
		var hasImage = !! attrs.url;

		function onSelectMedia( media ) {
			if ( ! media || ! media.url ) {
				return;
			}
			setAttributes( {
				id: media.id,
				url: media.url,
				alt: media.alt || ''
			} );
		}

		// Make the <figure> the block root (as core/image does) so the editor
		// canvas previews the real float + wrap instead of boxing it in a div.
		var fp = hasImage
			? figureProps( attrs )
			: { className: 'image-text-wrap is-placeholder', style: {} };
		var blockProps = useBlockProps( { className: fp.className, style: fp.style } );

		// ---- Inspector (right sidebar) controls ----
		var controls = el(
			InspectorControls,
			{},
			el(
				PanelBody,
				{ title: __( 'Text Wrap', 'image-text-wrap' ), initialOpen: true },
				el( SelectControl, {
					label: __( 'Wrap type', 'image-text-wrap' ),
					value: attrs.wrapMode,
					options: [
						{ label: __( 'Beside text (float / wrap)', 'image-text-wrap' ), value: 'beside' },
						{ label: __( 'Top & bottom (text jumps over)', 'image-text-wrap' ), value: 'stack' }
					],
					onChange: function ( v ) {
						var next = { wrapMode: v };
						// Center is only valid when stacked; drop back to left for float.
						if ( v === 'beside' && attrs.side === 'center' ) {
							next.side = 'left';
						}
						setAttributes( next );
					}
				} ),
				el( SelectControl, {
					label: __( 'Position', 'image-text-wrap' ),
					value: attrs.side,
					options: attrs.wrapMode === 'stack'
						? [
							{ label: __( 'Left', 'image-text-wrap' ), value: 'left' },
							{ label: __( 'Center', 'image-text-wrap' ), value: 'center' },
							{ label: __( 'Right', 'image-text-wrap' ), value: 'right' }
						]
						: [
							{ label: __( 'Left (text on the right)', 'image-text-wrap' ), value: 'left' },
							{ label: __( 'Right (text on the left)', 'image-text-wrap' ), value: 'right' }
						],
					onChange: function ( v ) { setAttributes( { side: v } ); }
				} ),
				attrs.wrapMode !== 'stack'
					? el( RangeControl, {
						label: __( 'Vertical offset (px)', 'image-text-wrap' ),
						help: __( 'Push the image down so text flows above it, then wraps beside and below (rectangular wrap).', 'image-text-wrap' ),
						value: attrs.offsetY,
						min: 0,
						max: 400,
						step: 4,
						onChange: function ( v ) { setAttributes( { offsetY: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack'
					? el( RangeControl, {
						label: __( 'Vertical gap (px)', 'image-text-wrap' ),
						help: __( 'Breathing room above and below the image (top gap is limited by the vertical offset).', 'image-text-wrap' ),
						value: attrs.gapY,
						min: 0,
						max: 80,
						step: 4,
						onChange: function ( v ) { setAttributes( { gapY: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack'
					? el( SelectControl, {
						label: __( 'Wrap shape', 'image-text-wrap' ),
						value: attrs.shape,
						options: [
							{ label: __( 'Rectangle (bounding box)', 'image-text-wrap' ), value: 'rectangle' },
							{ label: __( 'Circle', 'image-text-wrap' ), value: 'circle' },
							{ label: __( 'Ellipse', 'image-text-wrap' ), value: 'ellipse' }
						],
						onChange: function ( v ) { setAttributes( { shape: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack'
					? el( RangeControl, {
						label: __( 'Wrap offset (px)', 'image-text-wrap' ),
						value: attrs.offset,
						min: 0,
						max: 80,
						onChange: function ( v ) { setAttributes( { offset: v } ); }
					} )
					: null,
				el( RangeControl, {
					label: __( 'Display width (px)', 'image-text-wrap' ),
					value: attrs.width,
					min: 120,
					max: 1000,
					onChange: function ( v ) { setAttributes( { width: v } ); }
				} ),
				el( TextareaControl, {
					label: __( 'Caption', 'image-text-wrap' ),
					help: __( 'Shown below the image; text wraps around image + caption together. Accepts simple inline HTML: <em>, <strong>, <a href>.', 'image-text-wrap' ),
					value: attrs.caption,
					onChange: function ( v ) { setAttributes( { caption: v } ); }
				} ),
				attrs.url
					? el(
						MediaUploadCheck,
						{},
						el( MediaUpload, {
							onSelect: onSelectMedia,
							allowedTypes: [ 'image' ],
							value: attrs.id,
							render: function ( o ) {
								return el(
									Button,
									{ variant: 'secondary', onClick: o.open, style: { marginTop: '8px' } },
									__( 'Replace image', 'image-text-wrap' )
								);
							}
						} )
					)
					: null
			)
		);

		// ---- No image yet: placeholder picker (block root = div) ----
		if ( ! hasImage ) {
			return el(
				Fragment,
				{},
				controls,
				el(
					'div',
					blockProps,
					el( MediaPlaceholder, {
						icon: 'format-image',
						labels: { title: __( 'Image Text Wrap', 'image-text-wrap' ), instructions: __( 'Upload or pick an image; body text placed after this block will wrap around it.', 'image-text-wrap' ) },
						onSelect: onSelectMedia,
						allowedTypes: [ 'image' ],
						accept: 'image/*'
					} )
				)
			);
		}

		// ---- Image chosen: block root = the floated figure itself ----
		return el(
			Fragment,
			{},
			controls,
			el(
				'figure',
				blockProps,
				el( 'img', { src: attrs.url, alt: attrs.alt } ),
				// Caption is edited in the sidebar; here it's display-only so the
				// canvas previews how the wrap includes it. RawHTML lets simple
				// inline markup (em / strong / a) render instead of showing as text.
				attrs.caption
					? el( 'figcaption', {}, el( RawHTML, {}, attrs.caption ) )
					: null
			)
		);
	}

	function Save( props ) {
		var attrs = props.attributes;
		if ( ! attrs.url ) {
			return null;
		}

		var fp = figureProps( attrs );
		var blockProps = useBlockProps.save( {
			className: fp.className,
			style: fp.style
		} );

		return el(
			'figure',
			blockProps,
			el( 'img', { src: attrs.url, alt: attrs.alt || '' } ),
			attrs.caption && attrs.caption.length
				? el( 'figcaption', {}, el( RawHTML, {}, attrs.caption ) )
				: null
		);
	}

	blocks.registerBlockType( 'image-text-wrap/image-text-wrap', {
		edit: Edit,
		save: Save
	} );
} )( window.wp.blocks, window.wp.element, window.wp.blockEditor, window.wp.components, window.wp.i18n );
