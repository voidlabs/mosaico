<?php

//die( "<pre>" . print_r( $_SERVER, true ) . "</pre>" );

/* configuration */

const BASE_URL = 1;
const BASE_DIR = 2;
const UPLOADS_URL = 3;
const UPLOADS_DIR = 4;
const STATIC_URL = 5;
const STATIC_DIR = 6;
const THUMBNAILS_URL = 7;
const THUMBNAILS_DIR = 8;
const THUMBNAIL_WIDTH = 9;
const THUMBNAIL_HEIGHT = 10;

require "config.php";
require "premailer.php";

//die( "<pre>" . print_r( $config, true ) . "</pre>" );

/**
 * entry point for all requests
 */

$http_response_code = 200;

$url = parse_url( $_SERVER[ "REQUEST_URI" ] );

if ( array_key_exists( "path", $url ) )
{
	$request = substr( $url[ "path" ], strlen( dirname( $url[ "path" ] ) ) );
	
	//die( "<pre>" . print_r( $request, true ) . "</pre>" );
	
	$request_handlers = [
		"/upload/" => "ProcessUploadRequest",
		"/img/" => "ProcessImgRequest",
		"/dl/" => "ProcessDlRequest"
	];
	
	if ( array_key_exists( $request, $request_handlers ) )
	{
		$request_handlers[ $request ]();
	}
	else
	{
		$http_response_code = 404;
	}
}
else
{
	$http_response_code = 500;
}

http_response_code( $http_response_code );

/**
 * handler for upload requests
 */
function ProcessUploadRequest()
{
	global $config;
	global $http_return_code;
	
	$files = array();

	if ( $_SERVER[ "REQUEST_METHOD" ] == "GET" )
	{
		$dir = scandir( $config[ BASE_DIR ] . $config[ UPLOADS_DIR ] );

		foreach ( $dir as $file_name )
		{
			$file_path = $config[ BASE_DIR ] . $config[ UPLOADS_DIR ] . $file_name;
			
			if ( is_file( $file_path ) )
			{
				$size = filesize( $file_path );
				
				$file = [
					"name" => $file_name,
					"url" => $config[ BASE_URL ] . $config[ UPLOADS_URL ] . $file_name,
					"size" => $size
				];

				if ( file_exists( $config[ BASE_DIR ] . $config[ THUMBNAILS_DIR ] . $file_name ) )
				{
					$file[ "thumbnailUrl" ] = $config[ BASE_URL ] . $config[ THUMBNAILS_URL ] . $file_name;
				}

				$files[] = $file;
			}
		}
	}
	else if ( !empty( $_FILES ) )
	{
		foreach ( $_FILES[ "files" ][ "error" ] as $key => $error )
		{
			if ( $error == UPLOAD_ERR_OK )
			{
				$tmp_name = $_FILES[ "files" ][ "tmp_name" ][ $key ];

				$file_name = $_FILES[ "files" ][ "name" ][ $key ];
				
				$file_path = $config[ BASE_DIR ] . $config[ UPLOADS_DIR ] . $file_name;

				if ( move_uploaded_file( $tmp_name, $file_path ) === TRUE )
				{
					$size = filesize( $file_path );

					$image = new Imagick( $file_path );

					$image->resizeImage( $config[ THUMBNAIL_WIDTH ], $config[ THUMBNAIL_HEIGHT ], Imagick::FILTER_LANCZOS, 1.0, TRUE );
					$image->writeImage( $config[ BASE_DIR ] . $config[ THUMBNAILS_DIR ] . $file_name );
					$image->destroy();
					
					$file = array(
						"name" => $file_name,
						"url" => $config[ BASE_URL ] . $config[ UPLOADS_URL ] . $file_name,
						"size" => $size,
						"thumbnailUrl" => $config[ BASE_URL ] . $config[ THUMBNAILS_URL ] . $file_name
					);

					$files[] = $file;
				}
				else
				{
					$http_return_code = 500;
					return;
				}
			}
			else
			{
				$http_return_code = 400;
				return;
			}
		}
	}
	
	header( "Content-Type: application/json; charset=utf-8" );
	header( "Connection: close" );

	echo json_encode( array( "files" => $files ) );
}

/**
 * handler for img requests
 */
function ProcessImgRequest()
{
	if ( $_SERVER[ "REQUEST_METHOD" ] == "GET" )
	{
		$method = $_GET[ "method" ];

		$params = explode( ",", $_GET[ "params" ] );

		$width = (int) $params[ 0 ];
		$height = (int) $params[ 1 ];

		if ( $method == "placeholder" )
		{
			$image = new Imagick();

			$image->newImage( $width, $height, "#707070" );
			$image->setImageFormat( "png" );

			$x = 0;
			$y = 0;
			$size = 40;

			$draw = new ImagickDraw();

			while ( $y < $height )
			{
				$draw->setFillColor( "#808080" );

				$points = [
					[ "x" => $x, "y" => $y ],
					[ "x" => $x + $size, "y" => $y ],
					[ "x" => $x + $size * 2, "y" => $y + $size ],
					[ "x" => $x + $size * 2, "y" => $y + $size * 2 ]
				];

				$draw->polygon( $points );

				$points = [
					[ "x" => $x, "y" => $y + $size ],
					[ "x" => $x + $size, "y" => $y + $size * 2 ],
					[ "x" => $x, "y" => $y + $size * 2 ]
				];

				$draw->polygon( $points );

				$x += $size * 2;

				if ( $x > $width )
				{
					$x = 0;
					$y += $size * 2;
				}
			}

			$draw->setFillColor( "#B0B0B0" );
			$draw->setFontSize( $width / 5 );
			$draw->setFontWeight( 800 );
			$draw->setGravity( Imagick::GRAVITY_CENTER );
			$draw->annotation( 0, 0, $width . " x " . $height );

			$image->drawImage( $draw );

			header( "Content-type: image/png" );

			echo $image;
		}
		else
		{
			$file_name = $_GET[ "src" ];

			$path_parts = pathinfo( $file_name );

			switch ( $path_parts[ "extension" ] )
			{
				case "png":
					$mime_type = "image/png";
					break;

				case "gif":
					$mime_type = "image/gif";
					break;

				default:
					$mime_type = "image/jpeg";
					break;
			}

			$file_name = $path_parts[ "basename" ];

			$image = ResizeImage( $file_name, $method, $width, $height );

			header( "Content-type: " . $mime_type );

			echo $image;
		}
	}
}

/**
 * handler for dl requests
 */
function ProcessDlRequest()
{
	global $config;
	global $http_return_code;
	
	/* run this puppy through premailer */

	$premailer = Premailer::html( $_POST[ "html" ], true, "hpricot", $config[ BASE_URL ] );

	$html = $premailer[ "html" ];

	/* create static versions of resized images */
	
	$matches = [];

	$num_full_pattern_matches = preg_match_all( '#<img.*?src="([^"]*?\/[^/]*\.[^"]+)#i', $html, $matches );

	for ( $i = 0; $i < $num_full_pattern_matches; $i++ )
	{
		if ( stripos( $matches[ 1 ][ $i ], "/img?src=" ) !== FALSE )
		{
			$src_matches = [];

			if ( preg_match( '#/img\?src=(.*)&amp;method=(.*)&amp;params=(.*)#i', $matches[ 1 ][ $i ], $src_matches ) !== FALSE )
			{
				$file_name = urldecode( $src_matches[ 1 ] );
				$file_name = substr( $file_name, strlen( $config[ BASE_URL ] . $config[ UPLOADS_URL ] ) );

				$method = urldecode( $src_matches[ 2 ] );

				$params = urldecode( $src_matches[ 3 ] );
				$params = explode( ",", $params );
				$width = (int) $params[ 0 ];
				$height = (int) $params[ 1 ];

				$static_file_name = $method . "_" . $width . "x" . $height . "_" . $file_name;

				$html = str_ireplace( $matches[ 1 ][ $i ], $config[ BASE_URL ] . $config[ STATIC_URL ] . urlencode( $static_file_name ), $html );

				$image = ResizeImage( $file_name, $method, $width, $height );

				$image->writeImage( $config[ BASE_DIR ] . $config[ STATIC_DIR ] . $static_file_name );
			}
		}
	}

	/* perform the requested action */

	switch ( $_POST[ "action" ] )
	{
		case "download":
		{
			header( "Content-Type: application/force-download" );
			header( "Content-Disposition: attachment; filename=\"" . $_POST[ "filename" ] . "\"" );
			header( "Content-Length: " . strlen( $html ) );

			echo $html;

			break;
		}

		case "email":
		{
			$to = $_POST[ "rcpt" ];
			$subject = $_POST[ "subject" ];

			$headers = array();

			$headers[] = "MIME-Version: 1.0";
			$headers[] = "Content-type: text/html; charset=iso-8859-1";
			$headers[] = "To: $to";
			$headers[] = "Subject: $subject";

			$headers = implode( "\r\n", $headers );

			if ( mail( $to, $subject, $html, $headers ) === FALSE )
			{
				$http_return_code = 500;
				return;
			}

			break;
		}
	}
}

/**
 * function to resize images using resize or cover methods
 */
function ResizeImage( $file_name, $method, $width, $height )
{
	global $config;

	$image = new Imagick( $config[ BASE_DIR ] . $config[ UPLOADS_DIR ] . $file_name );

	if ( $method == "resize" )
	{
		$image->resizeImage( $width, $height, Imagick::FILTER_LANCZOS, 1.0 );
	}
	else // $method == "cover"
	{
		$image_geometry = $image->getImageGeometry();

		$width_ratio = $image_geometry[ "width" ] / $width;
		$height_ratio = $image_geometry[ "height" ] / $height;

		$resize_width = $width;
		$resize_height = $height;

		if ( $width_ratio > $height_ratio )
		{
			$resize_width = 0;
		}
		else
		{
			$resize_height = 0;
		}

		$image->resizeImage( $resize_width, $resize_height, Imagick::FILTER_LANCZOS, 1.0 );

		$image_geometry = $image->getImageGeometry();

		$x = ( $image_geometry[ "width" ] - $width ) / 2;
		$y = ( $image_geometry[ "height" ] - $height ) / 2;

		$image->cropImage( $width, $height, $x, $y );
	}
	
	return $image;
}
