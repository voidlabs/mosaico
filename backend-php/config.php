<?php

/* note that all _URL and _DIR configurations below must end with a forward slash (/) */

$config = [
	
	/* base url for image folders */
	BASE_URL => ( array_key_exists( "HTTPS", $_SERVER ) ? "https://" : "http://" ) . $_SERVER[ "HTTP_HOST" ] . dirname( dirname( $_SERVER[ "PHP_SELF" ] ) ) . "/",
	
	/* local file system base path to where image directories are located */
	BASE_DIR => dirname( dirname( $_SERVER[ "SCRIPT_FILENAME" ] ) ) . "/",
	
	/* url to the uploads folder (relative to BASE_URL) */
	UPLOADS_URL => "uploads/",
	
	/* local file system path to the uploads folder (relative to BASE_DIR) */
	UPLOADS_DIR => "uploads/",
	
	/* url to the static images folder (relative to BASE_URL) */
	STATIC_URL => "uploads/static/",

	/* local file system path to the static images folder (relative to BASE_DIR) */
	STATIC_DIR => "uploads/static/",
	
	/* url to the thumbnail images folder (relative to BASE_URL */
	THUMBNAILS_URL => "uploads/thumbnails/",
	
	/* local file system path to the thumbnail images folder (relative to BASE_DIR) */
	THUMBNAILS_DIR => "uploads/thumbnails/",
	
	/* width and height of generated thumbnails */
	THUMBNAIL_WIDTH => 90,
	THUMBNAIL_HEIGHT => 90
];
