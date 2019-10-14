<?php
include 'simple_html_dom.php';

if($_REQUEST['action'] == 'getPollingInfo'){
    // TODO: Validate and sanitize this input.
    $postalCode = $_REQUEST['postalCode'];
    $province = $_REQUEST['province'];
    
    $pollingInfo = getPollingInfo($postalCode, $province);
    $pollingInfo->candidates = getCandidates($postalCode, $province);

    echo json_encode($pollingInfo);
}

/**
 * Scrapes polling station info from elections.ca using a postal code and province as query parameters.
 * 
 * @param string $postalCode The user's postal code.
 * @param string $province The user's province.
 * 
 * @return array Returns an array of objects containing key-value pairs that describe a polling station.
 */
function getPollingInfo($postalCode, $province){
    $url = 'https://elections.ca/Scripts/vis/voting?L=e&ED=35035&EV=51&EV_TYPE=1&PC={postalcode}&PROV={province}&PROVID=35&MAPID=&QID=3&PAGEID=31&TPAGEID=&PD=&STAT_CODE_ID=15';
    $url = str_replace('{postalcode}', $postalCode, $url);
    $url = str_replace('{province}', $province, $url);
    $html = file_get_html($url);
    $pollingInfo = new stdClass();
    
    $pollingInfo->coordinates = $html->find('input[id=coordinate1]', 0)->value;
    $pollingStation = array();

    foreach($html->find('div[id=divOrdPoll] ul li') as $info){
        $pollingStation[] = $info->innertext;
    }
    $pollingInfo->hours = substr($pollingStation[0], 18, 22);
    $pollingInfo->name = $pollingStation[1];
    $pollingInfo->address = $pollingStation[2];
    $pollingInfo->city = $pollingStation[3];

    $pollingInfo->error = 'Caught exception in getPollingInfo: ' + $e->getMessage();
    
    
    return $pollingInfo;
}

/**
 * Scrapes candidate info from elections.ca using a postal code and province as query parameters.
 * 
 * @param string $postalCode The user's postal code.
 * @param string $province The user's province.
 * 
 * @return array Returns an array of arrays, with each sub-array containing key-value pairs that represent information for a single candidate.
 */
function getCandidates($postalCode, $province){
    $url = 'https://elections.ca/Scripts/vis/candidates?L=e&ED=35035&EV=51&EV_TYPE=1&PC={postalCode}&PROV={province}&PROVID=35&QID=-1&PAGEID=17';
    $url = str_replace('{postalcode}', $postalCode, $url);
    $url = str_replace('{province}', $province, $url);
    $html = file_get_html($url);
    $candidates = array();
    $candidateList = array();

    foreach($html->find('table tr') as $candidate){
        $candidateList[] = $candidate;
    }
    array_shift($candidateList);   // We don't need the table headers.
    foreach($candidateList as $candidate){
        $candidateInfo = new stdClass();
        $candidateInfo->name = trim($candidate->find('td', 0)->innertext);
        $candidateInfo->party = trim($candidate->find('td', 2)->innertext);
        $candidateInfo->phone = trim($candidate->find('td', 3)->innertext);
        $candidateInfo->website = isset($candidate->find('td a[href]', 0)->href) ? trim($candidate->find('td a[href]', 0)->href) : '';
        $candidates[] = $candidateInfo;
    }
    return $candidates;
}


?>