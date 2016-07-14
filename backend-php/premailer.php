<?php
/**
 * Premailer API PHP class
 * Premailer is a library/service for making HTML more palatable for various inept email clients, in particular GMail
 * Primary function is to convert style tags into equivalent inline styles so styling can survive <head> tag removal
 * Premailer is owned by Dialect Communications group
 * @link http://premailer.dialect.ca/api
 * @author Marcus Bointon <marcus@synchromedia.co.uk>
 */
 
class Premailer {
	/**
	 * The Premailer API URL
	 */
	const ENDPOINT = 'http://premailer.dialect.ca/api/0.1/documents';
	static $CI ;
	public function __construct()
	{
		self::$CI =& get_instance();
		self::$CI->load->library('my_curl');
		
	}
	/**
	 * Central static method for submitting either an HTML string or a URL, optionally retrieving converted versions
	 * @static
	 * @throws Exception
	 * @param string $html Raw HTML source
	 * @param string $url URL of the source file
	 * @param bool $fetchresult Whether to also fetch the converted output
	 * @param string $adaptor Which document handler to use (hpricot (default) or nokigiri)
	 * @param string $base_url Base URL for converting relative links
	 * @param int $line_length Length of lines in the plain text version (default 65)
	 * @param string $link_query_string Query string appended to links
	 * @param bool $preserve_styles Whether to preserve any link rel=stylesheet and style elements
	 * @param bool $remove_ids Remove IDs from the HTML document?
	 * @param bool $remove_classes Remove classes from the HTML document?
	 * @param bool $remove_comments Remove comments from the HTML document?
	 * @return array Either a single strclass object containing the decoded JSON response, or a 3-element array containing result, html and plain parts if $fetchresult is set
	 */
	protected static function convert($html = '', $url = '', $fetchresult = true, $adaptor = 'hpricot', $base_url = '', $line_length = 65, $link_query_string = '', $preserve_styles = true, $remove_ids = false, $remove_classes = false, $remove_comments = false) {
		$params = array();
		if (!empty($html)) {
			$params['html'] = $html;
		} elseif (!empty($url)) {
			$params['url'] = $url;
		} else {
			throw new Exception('Must supply an html or url value');
		}
		if ($adaptor == 'hpricot' or $adaptor == 'nokigiri') {
			$params['adaptor'] = $adaptor;
		}
		if (!empty($base_url)) {
			$params['base_url'] = $base_url;
		}
		$params['line_length'] = (integer)$line_length;
		if (!empty($link_query_string)) {
			$params['link_query_string'] = $link_query_string;
		}
		$params['preserve_styles'] = ($preserve_styles?'true':'false');
		$params['remove_ids'] = ($remove_ids?'true':'false');
		$params['$remove_classes'] = ($remove_classes?'true':'false');
		$params['$remove_comments'] = ($remove_comments?'true':'false');
		$options = array(
			'timeout' => 15,
			'connecttimeout' => 15,
			'useragent' => 'PHP Premailer',
			'ssl' => array('verifypeer' => false, 'verifyhost' => false)
		);
	//	$h = new HttpRequest(self::ENDPOINT, HttpRequest::METH_POST, $options);
		
	
		$conf = array(
				'url'	=> self::ENDPOINT,
				'timeout' => 15,
				'useragent' => 'PHP Premailer',
				'ssl_verifyhost'	=> 0,
				'SSL_VERIFYPEER'	=> 0,
				'post'		=> 1,
				'postfields' => $params,
				'returntransfer' => true,
				'httpheader' => array("Expect:")
			);
		
		foreach($conf as $key => $value){
			$name = constant('CURLOPT_'.strtoupper($key));
			$val  = $value;
			$data_conf[$name] = $val;
		}
		$cu = curl_init();
		curl_setopt_array($cu, $data_conf);
		$exec = curl_exec($cu);	
		$_res			= json_decode($exec);
		$_res_info 	= json_decode(json_encode(curl_getinfo($cu))); 	
		curl_close($cu);
		if($_res_info->http_code != 201){
			$code = $_res_info->http_code;
			switch ($code) {
				case 400:
					throw new Exception('Content missing', 400);
					break;
				case 403:
					throw new Exception('Access forbidden', 403);
					break;
				case 500:
				default:
					throw new Exception('Error', $code);
			}
			
		}
		$return = array('result' => $_res);
		if ($fetchresult) {
			$html = curl_init();
			curl_setopt_array(
					$html, array(
						CURLOPT_URL 			=> $_res->documents->html,
						CURLOPT_TIMEOUT 		=> 15,
						CURLOPT_USERAGENT 		=> 'PHP Premailer',
						CURLOPT_SSL_VERIFYHOST	=> 0,
						CURLOPT_SSL_VERIFYPEER	=> 0,
						CURLOPT_HTTPHEADER 		=> array("Expect:"),
						CURLOPT_RETURNTRANSFER 	=> true
					)
				);
			$return['html'] = curl_exec($html);
			curl_close($html);
			
			$plain = curl_init();
			curl_setopt_array(
					$plain, array(
						CURLOPT_URL 			=> $_res->documents->txt,
						CURLOPT_TIMEOUT 		=> 15,
						CURLOPT_USERAGENT 		=> 'PHP Premailer',
						CURLOPT_SSL_VERIFYHOST	=> 0,
						CURLOPT_SSL_VERIFYPEER	=> 0,
						CURLOPT_HTTPHEADER 		=> array("Expect:"),
						CURLOPT_RETURNTRANSFER 	=> true
					)
				);
			$return['plain'] = curl_exec($plain);
			curl_close($plain);
		
			return $return;
		}
		return $result;
		
	}
 
	/**
	 * Central static method for submitting either an HTML string or a URL, optionally retrieving converted versions
	 * @static
	 * @throws Exception
	 * @param string $html Raw HTML source
	 * @param bool $fetchresult Whether to also fetch the converted output
	 * @param string $adaptor Which document handler to use (hpricot (default) or nokigiri)
	 * @param string $base_url Base URL for converting relative links
	 * @param int $line_length Length of lines in the plain text version (default 65)
	 * @param string $link_query_string Query string appended to links
	 * @param bool $preserve_styles Whether to preserve any link rel=stylesheet and style elements
	 * @param bool $remove_ids Remove IDs from the HTML document?
	 * @param bool $remove_classes Remove classes from the HTML document?
	 * @param bool $remove_comments Remove comments from the HTML document?
	 * @return array Either a single element array containing the 'result' object, or three elements containing result, html and plain if $fetchresult is set
	 */
	public static function html($html, $fetchresult = true, $adaptor = 'hpricot', $base_url = '', $line_length = 65, $link_query_string = '', $preserve_styles = true, $remove_ids = false, $remove_classes = false, $remove_comments = false) {
		return self::convert($html, '', $fetchresult, $adaptor, $base_url, $line_length, $link_query_string, $preserve_styles, $remove_ids, $remove_classes, $remove_comments);
	}
 
	/**
	 * Central static method for submitting either an HTML string or a URL, optionally retrieving converted versions
	 * @static
	 * @throws Exception
	 * @param string $url URL of the source file
	 * @param bool $fetchresult Whether to also fetch the converted output
	 * @param string $adaptor Which document handler to use (hpricot (default) or nokigiri)
	 * @param string $base_url Base URL for converting relative links
	 * @param int $line_length Length of lines in the plain text version (default 65)
	 * @param string $link_query_string Query string appended to links
	 * @param bool $preserve_styles Whether to preserve any link rel=stylesheet and style elements
	 * @param bool $remove_ids Remove IDs from the HTML document?
	 * @param bool $remove_classes Remove classes from the HTML document?
	 * @param bool $remove_comments Remove comments from the HTML document?
	 * @return array Either a single element array containing the 'result' object, or three elements containing result, html and plain if $fetchresult is set
	 */
	public static function url($url, $fetchresult = true, $adaptor = 'hpricot', $base_url = '', $line_length = 65, $link_query_string = '', $preserve_styles = true, $remove_ids = false, $remove_classes = false, $remove_comments = false) {
		return self::convert('', $url, $fetchresult, $adaptor, $base_url, $line_length, $link_query_string, $preserve_styles, $remove_ids, $remove_classes, $remove_comments);
	}
}
 
/*
Simplest usage:
$pre = Premailer::html($var_with_some_html_in);
$html = $pre['html'];
$plain = $pre['plain'];
//Similarly for URLs:
$pre = Premailer::url($url);
*/