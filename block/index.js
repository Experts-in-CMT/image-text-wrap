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
	var RichText = blockEditor.RichText;
	var InspectorControls = blockEditor.InspectorControls;
	var MediaUpload = blockEditor.MediaUpload;
	var MediaUploadCheck = blockEditor.MediaUploadCheck;
	var MediaPlaceholder = blockEditor.MediaPlaceholder;

	var PanelBody = components.PanelBody;
	var SelectControl = components.SelectControl;
	var RangeControl = components.RangeControl;
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
		var gapTop = typeof attrs.gapTop === 'number' ? attrs.gapTop : 0;
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
			var isShape = ( shape === 'circle' || shape === 'ellipse' );

			if ( isShape ) {
				// CONTOUR wrap (circle / ellipse): text stands off the wrap contour by
				// a single uniform Contour offset, InDesign-style. The contour is the
				// shape enclosing the image AND its caption, so the caption is always
				// inside the wrap and can never be overrun.
				//
				// The standoff is created by growing the wrap SHAPE itself, never by
				// shape-margin (which collapses to ~0 where the shape meets the box
				// edge) and never by stuffing the gap into padding-top (which moved
				// the image when the slider moved). Geometry:
				//
				//   padding-top    = offsetY               (vertical offset ONLY;
				//                    the contour offset never moves the image)
				//   padding side   = offset (text side), 0 (flush side)
				//   padding-bottom = offset
				//
				//   ellipse( rX  calc(50% + dR)  at  cX  calc(50% + dC) ) border-box
				//     rX = width/2 + offset          cX = padLeft + width/2
				//     dR = (offset - offsetY) / 2
				//     dC = (offsetY - offset) / 2
				//
				// gapY (bounding box only) is deliberately ignored here: its control
				// is hidden in contour mode, so a stale value must not distort the
				// geometry.
				//
				// The calc(50% ± k) terms make the vertical radius/centre EXACT for
				// any caption height without measuring it: the 50% absorbs the
				// unknown caption, the constant absorbs the paddings. Derived edges:
				//   shape top    = image top - offset   (standoff above, within offsetY)
				//   shape bottom = caption bottom + offset
				//   shape sides  = image edge ± offset; flush side clips at the column
				// On a square image with no caption the ellipse IS a circle; a true
				// circle cannot enclose a caption, so with one the contour is the
				// enclosing ellipse.
				classes.push( 'shape-' + ( ( hasCaption && shape === 'circle' ) ? 'ellipse' : shape ) );
				classes.push( 'has-shape' );

				// content-box keeps `width` equal to the image width; the padding
				// (outside it) grows the border box the shape is measured from.
				style.boxSizing = 'content-box';

				var padLeft = ( side === 'right' ) ? offset : 0;   // text runs on the left
				var padRight = ( side === 'right' ) ? 0 : offset;  // text runs on the right
				style.paddingLeft = padLeft + 'px';
				style.paddingRight = padRight + 'px';
				if ( offsetY > 0 ) {
					style.paddingTop = offsetY + 'px';
				}
				style.paddingBottom = offset + 'px';
				style.marginBottom = '0';

				var round2 = function ( n ) { return Math.round( n * 100 ) / 100; };
				var rX = round2( ( width / 2 ) + offset );
				var cX = round2( padLeft + ( width / 2 ) );
				var dR = round2( ( offset - offsetY ) / 2 );
				var dC = round2( ( offsetY - offset ) / 2 );
				style.shapeOutside = 'ellipse(' + rX + 'px calc(50% + ' + dR + 'px) at ' +
					cX + 'px calc(50% + ' + dC + 'px)) border-box';
			} else {
				// BOUNDING BOX wrap (rectangle): independent per-side gaps,
				// InDesign-style — Text-side gap (offset), Gap above (gapTop) and
				// Gap below (gapY) — plus the Vertical offset. Implemented as real
				// padding + an inset shape-outside; no round geometry needed.
				classes.push( 'shape-rectangle' );

				var useInset = offsetY > 0 || gapY > 0;
				if ( useInset ) {
					// All gaps are REAL padding; the inset shape-outside spans the
					// padded box so text avoids it. content-box keeps `width` equal
					// to the image width.
					//
					//   padding-top    = offsetY  (drops the image; text flows above)
					//   padding-bottom = gapY     (space below image before text resumes)
					//   padding side   = offset   (text-side gap)
					//   shape top inset= offsetY - gapTop  (holds text gapTop above
					//                    the image top; only offsetY of room exists)
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
					var insetTop = Math.max( 0, offsetY - gapTop );
					style.shapeOutside = 'inset(' + insetTop + 'px 0px 0px 0px)';
				}
				// Offset 0 + gap 0: a plain rectangular float; the text-side gap is
				// the box margin (set in CSS), so no shape-outside is needed.
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
					? el( SelectControl, {
						label: __( 'Wrap around', 'image-text-wrap' ),
						help: __( 'Bounding box wraps text to the image’s box with per-side gaps. Contour wraps text along a circle or ellipse enclosing the image and caption, with one uniform offset.', 'image-text-wrap' ),
						value: attrs.shape,
						options: [
							{ label: __( 'Bounding box', 'image-text-wrap' ), value: 'rectangle' },
							{ label: __( 'Contour: circle', 'image-text-wrap' ), value: 'circle' },
							{ label: __( 'Contour: ellipse', 'image-text-wrap' ), value: 'ellipse' }
						],
						onChange: function ( v ) { setAttributes( { shape: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack'
					? el( RangeControl, {
						label: __( 'Vertical offset (px)', 'image-text-wrap' ),
						help: __( 'Push the image down so text flows above it before wrapping beside and below.', 'image-text-wrap' ),
						value: attrs.offsetY,
						min: 0,
						max: 400,
						step: 4,
						onChange: function ( v ) { setAttributes( { offsetY: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack' && ( attrs.shape === 'circle' || attrs.shape === 'ellipse' )
					? el( RangeControl, {
						label: __( 'Contour offset (px)', 'image-text-wrap' ),
						help: __( 'Standoff between the text and the wrap contour. The gap above the image is limited by the vertical offset. Never moves the image.', 'image-text-wrap' ),
						value: attrs.offset,
						min: 0,
						max: 120,
						onChange: function ( v ) { setAttributes( { offset: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack' && ! ( attrs.shape === 'circle' || attrs.shape === 'ellipse' )
					? el( RangeControl, {
						label: __( 'Text-side gap (px)', 'image-text-wrap' ),
						help: __( 'Gap between the box and the wrapping text on the text side.', 'image-text-wrap' ),
						value: attrs.offset,
						min: 0,
						max: 120,
						onChange: function ( v ) { setAttributes( { offset: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack' && ! ( attrs.shape === 'circle' || attrs.shape === 'ellipse' )
					? el( RangeControl, {
						label: __( 'Gap above image (px)', 'image-text-wrap' ),
						help: __( 'Gap between the text above and the top of the box. Needs a vertical offset to have room.', 'image-text-wrap' ),
						value: attrs.gapTop,
						min: 0,
						max: 120,
						step: 4,
						onChange: function ( v ) { setAttributes( { gapTop: v } ); }
					} )
					: null,
				attrs.wrapMode !== 'stack' && ! ( attrs.shape === 'circle' || attrs.shape === 'ellipse' )
					? el( RangeControl, {
						label: __( 'Gap below image (px)', 'image-text-wrap' ),
						help: __( 'Gap between the bottom of the box and the text that resumes below.', 'image-text-wrap' ),
						value: attrs.gapY,
						min: 0,
						max: 120,
						step: 4,
						onChange: function ( v ) { setAttributes( { gapY: v } ); }
					} )
					: null,
				el( RangeControl, {
					label: __( 'Display width (px)', 'image-text-wrap' ),
					value: attrs.width,
					min: 120,
					max: 1000,
					onChange: function ( v ) { setAttributes( { width: v } ); }
				} ),
				el(
					'p',
					{ className: 'components-base-control__help' },
					__( 'Caption: click below the image in the canvas to write one. Text wraps around image + caption together. Style the caption text under Styles → Typography.', 'image-text-wrap' )
				),
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
				// Caption is edited in place, like core/image. RichText enforces the
				// inline-only format whitelist (bold, italic, link) that the old raw
				// textarea merely documented, and previews the wrap around it live.
				( attrs.caption || props.isSelected )
					? el( RichText, {
						tagName: 'figcaption',
						'aria-label': __( 'Image caption text', 'image-text-wrap' ),
						placeholder: __( 'Add a caption (credit, source)', 'image-text-wrap' ),
						value: attrs.caption,
						allowedFormats: [ 'core/bold', 'core/italic', 'core/link' ],
						onChange: function ( v ) { setAttributes( { caption: v } ); }
					} )
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
				? el( RichText.Content, { tagName: 'figcaption', value: attrs.caption } )
				: null
		);
	}

	/* =====================================================================
	 * Deprecations: exact replicas of every save() this block ever shipped,
	 * so published posts keep validating across upgrades. Newest first.
	 * ===================================================================== */

	// --- v1.3.0: like current, but gapY leaked into the contour geometry ---
	function figurePropsV130( attrs ) {
		var mode = attrs.wrapMode === 'stack' ? 'stack' : 'beside';
		var shape = attrs.shape || 'rectangle'; if ( shape !== 'circle' && shape !== 'ellipse' ) { shape = 'rectangle'; }
		var offset = typeof attrs.offset === 'number' ? attrs.offset : 16;
		var offsetY = typeof attrs.offsetY === 'number' ? attrs.offsetY : 0;
		var gapY = typeof attrs.gapY === 'number' ? attrs.gapY : 0;
		var gapTop = typeof attrs.gapTop === 'number' ? attrs.gapTop : 0;
		var width = typeof attrs.width === 'number' ? attrs.width : 300;
		var hasCaption = !! ( attrs.caption && attrs.caption.length );

		var side = attrs.side;
		if ( mode === 'beside' ) {
			side = side === 'right' ? 'right' : 'left';
		} else {
			side = ( side === 'right' || side === 'center' ) ? side : 'left';
		}

		var classes = [ 'image-text-wrap' ];
		if ( mode === 'stack' ) {
			classes.push( 'wrap-stack' );
		}
		classes.push( 'align-' + side );

		var style = {
			width: width + 'px',
			'--image-text-wrap-offset': offset + 'px'
		};

		if ( mode === 'beside' ) {
			var isShape = ( shape === 'circle' || shape === 'ellipse' );

			if ( isShape ) {
				classes.push( 'shape-' + ( ( hasCaption && shape === 'circle' ) ? 'ellipse' : shape ) );
				classes.push( 'has-shape' );
				style.boxSizing = 'content-box';

				var padLeft = ( side === 'right' ) ? offset : 0;
				var padRight = ( side === 'right' ) ? 0 : offset;
				style.paddingLeft = padLeft + 'px';
				style.paddingRight = padRight + 'px';
				if ( offsetY > 0 ) {
					style.paddingTop = offsetY + 'px';
				}
				style.paddingBottom = ( offset + gapY ) + 'px';
				style.marginBottom = '0';

				var round2 = function ( n ) { return Math.round( n * 100 ) / 100; };
				var rX = round2( ( width / 2 ) + offset );
				var cX = round2( padLeft + ( width / 2 ) );
				var dR = round2( ( offset - offsetY - gapY ) / 2 );
				var dC = round2( ( offsetY - offset - gapY ) / 2 );
				style.shapeOutside = 'ellipse(' + rX + 'px calc(50% + ' + dR + 'px) at ' +
					cX + 'px calc(50% + ' + dC + 'px)) border-box';
			} else {
				classes.push( 'shape-rectangle' );

				var useInset = offsetY > 0 || gapY > 0;
				if ( useInset ) {
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

					var insetTop = Math.max( 0, offsetY - gapTop );
					style.shapeOutside = 'inset(' + insetTop + 'px 0px 0px 0px)';
				}
			}
		}

		return { className: classes.join( ' ' ), style: style };
	}

	// --- v1.0.0 to v1.2.0: shape-margin shapes, caption forced rectangle ---
	// allowContour replicates v1.0.0 to v1.1.1, which had no shape whitelist
	// and shipped the silhouette wrap (shape-outside: url + alpha threshold)
	// that v1.2.0 removed; v1.2.0 also added the coercion to rectangle.
	function figurePropsV120( attrs, allowContour ) {
		var mode = attrs.wrapMode === 'stack' ? 'stack' : 'beside';
		var shape = attrs.shape || 'rectangle';
		if ( ! allowContour && shape !== 'circle' && shape !== 'ellipse' ) { shape = 'rectangle'; }
		var offset = typeof attrs.offset === 'number' ? attrs.offset : 16;
		var offsetY = typeof attrs.offsetY === 'number' ? attrs.offsetY : 0;
		var gapY = typeof attrs.gapY === 'number' ? attrs.gapY : 0;
		var width = typeof attrs.width === 'number' ? attrs.width : 300;
		var hasCaption = !! ( attrs.caption && attrs.caption.length );

		var side = attrs.side;
		if ( mode === 'beside' ) {
			side = side === 'right' ? 'right' : 'left';
		} else {
			side = ( side === 'right' || side === 'center' ) ? side : 'left';
		}

		var classes = [ 'image-text-wrap' ];
		if ( mode === 'stack' ) {
			classes.push( 'wrap-stack' );
		}
		classes.push( 'align-' + side );

		var style = {
			width: width + 'px',
			'--image-text-wrap-offset': offset + 'px'
		};

		if ( mode === 'beside' ) {
			var useInset = offsetY > 0 || gapY > 0;

			if ( useInset ) {
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

				var insetTop = Math.max( 0, offsetY - gapY );
				style.shapeOutside = 'inset(' + insetTop + 'px 0px 0px 0px)';
			} else {
				var effectiveShape = ( hasCaption && shape !== 'rectangle' ) ? 'rectangle' : shape;
				classes.push( 'shape-' + effectiveShape );
				if ( effectiveShape !== 'rectangle' ) {
					classes.push( 'has-shape' );
				}

				if ( effectiveShape === 'contour' && attrs.url ) {
					style.shapeOutside = 'url("' + attrs.url + '")';
					style.shapeImageThreshold = String(
						typeof attrs.threshold === 'number' ? attrs.threshold : 0.5
					);
					style.shapeMargin = offset + 'px';
				} else if ( effectiveShape === 'circle' ) {
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

	// v1.0.0 differed from v1.1/1.2 only in having no caption at all.
	function saveV130( props ) {
		var attrs = props.attributes;
		if ( ! attrs.url ) {
			return null;
		}
		var fp = figurePropsV130( attrs );
		var blockProps = useBlockProps.save( { className: fp.className, style: fp.style } );
		return el(
			'figure',
			blockProps,
			el( 'img', { src: attrs.url, alt: attrs.alt || '' } ),
			attrs.caption && attrs.caption.length
				? el( 'figcaption', {}, el( RawHTML, {}, attrs.caption ) )
				: null
		);
	}

	function saveV120( props ) {
		var attrs = props.attributes;
		if ( ! attrs.url ) {
			return null;
		}
		var fp = figurePropsV120( attrs );
		var blockProps = useBlockProps.save( { className: fp.className, style: fp.style } );
		return el(
			'figure',
			blockProps,
			el( 'img', { src: attrs.url, alt: attrs.alt || '' } ),
			attrs.caption && attrs.caption.length
				? el( 'figcaption', {}, el( RawHTML, {}, attrs.caption ) )
				: null
		);
	}

	// v1.1.0 / v1.1.1: same as v1.2.0 but the silhouette contour still existed.
	function saveV11x( props ) {
		var attrs = props.attributes;
		if ( ! attrs.url ) {
			return null;
		}
		var fp = figurePropsV120( attrs, true );
		var blockProps = useBlockProps.save( { className: fp.className, style: fp.style } );
		return el(
			'figure',
			blockProps,
			el( 'img', { src: attrs.url, alt: attrs.alt || '' } ),
			attrs.caption && attrs.caption.length
				? el( 'figcaption', {}, el( RawHTML, {}, attrs.caption ) )
				: null
		);
	}

	function saveV100( props ) {
		var attrs = props.attributes;
		if ( ! attrs.url ) {
			return null;
		}
		var fp = figurePropsV120( attrs, true );
		var blockProps = useBlockProps.save( { className: fp.className, style: fp.style } );
		return el(
			'figure',
			blockProps,
			el( 'img', { src: attrs.url, alt: attrs.alt } )
		);
	}

	var LEGACY_SUPPORTS = { anchor: true, html: false, className: true };

	var ATTRS_BASE = {
		id: { type: 'number' },
		url: { type: 'string', default: '' },
		alt: { type: 'string', default: '' },
		width: { type: 'number', default: 300 },
		wrapMode: { type: 'string', default: 'beside' },
		side: { type: 'string', default: 'left' },
		shape: { type: 'string', default: 'rectangle' },
		offset: { type: 'number', default: 16 },
		offsetY: { type: 'number', default: 0 },
		gapY: { type: 'number', default: 0 }
	};

	function withAttrs( extra ) {
		var out = {};
		Object.keys( ATTRS_BASE ).forEach( function ( k ) { out[ k ] = ATTRS_BASE[ k ]; } );
		Object.keys( extra || {} ).forEach( function ( k ) { out[ k ] = extra[ k ]; } );
		return out;
	}

	// Shared legacy migration: the old vertical-gap doubled as the top gap, so
	// carry it into gapTop; and scrub generated wrap classes that block
	// recoveries stuffed into className over the years (has-shape is a live
	// CSS class and would wrongly restyle the migrated block).
	function migrateLegacy( attrs ) {
		var out = {};
		Object.keys( attrs ).forEach( function ( k ) { out[ k ] = attrs[ k ]; } );
		out.gapTop = typeof attrs.gapY === 'number' ? attrs.gapY : 0;
		if ( typeof out.className === 'string' ) {
			var scrubbed = out.className.split( /\s+/ ).filter( function ( c ) {
				return c && c !== 'has-shape' && c.indexOf( 'shape-' ) !== 0;
			} ).join( ' ' );
			if ( scrubbed ) {
				out.className = scrubbed;
			} else {
				delete out.className;
			}
		}
		return out;
	}

	// v1.2.0 rendered any non circle/ellipse shape as a rectangle, so keep
	// that appearance for blocks whose markup matched the v1.2.0 save.
	function migrateV120( attrs ) {
		var out = migrateLegacy( attrs );
		if ( out.shape !== 'rectangle' && out.shape !== 'circle' && out.shape !== 'ellipse' ) {
			out.shape = 'rectangle';
		}
		return out;
	}

	// v1.0.0 to v1.1.1 silhouette-contour blocks wrapped along the image's
	// alpha silhouette; the enclosing ellipse is the closest modern contour.
	function migrateV11x( attrs ) {
		var out = migrateLegacy( attrs );
		if ( out.shape !== 'rectangle' && out.shape !== 'circle' && out.shape !== 'ellipse' ) {
			out.shape = 'ellipse';
		}
		return out;
	}

	var deprecated = [
		{
			// v1.3.0
			attributes: withAttrs( {
				gapTop: { type: 'number', default: 0 },
				caption: { type: 'string', default: '' }
			} ),
			supports: {
				anchor: true,
				html: false,
				className: true,
				typography: {
					fontSize: true,
					lineHeight: true,
					__experimentalFontStyle: true,
					__experimentalFontWeight: true,
					__experimentalLetterSpacing: true,
					__experimentalTextTransform: true,
					__experimentalTextDecoration: true
				}
			},
			save: saveV130
		},
		{
			// v1.2.0 (shape whitelist; silhouette contour removed)
			attributes: withAttrs( {
				threshold: { type: 'number', default: 0.5 },
				caption: { type: 'string', default: '' }
			} ),
			supports: LEGACY_SUPPORTS,
			save: saveV120,
			migrate: migrateV120
		},
		{
			// v1.1.0 / v1.1.1 (silhouette contour still available)
			attributes: withAttrs( {
				threshold: { type: 'number', default: 0.5 },
				caption: { type: 'string', default: '' }
			} ),
			supports: LEGACY_SUPPORTS,
			save: saveV11x,
			migrate: migrateV11x
		},
		{
			// v1.0.0 (no caption; silhouette contour available)
			attributes: withAttrs( {
				threshold: { type: 'number', default: 0.5 }
			} ),
			supports: LEGACY_SUPPORTS,
			save: saveV100,
			migrate: migrateV11x
		}
	];

	blocks.registerBlockType( 'image-text-wrap/image-text-wrap', {
		edit: Edit,
		save: Save,
		deprecated: deprecated
	} );
} )( window.wp.blocks, window.wp.element, window.wp.blockEditor, window.wp.components, window.wp.i18n );
