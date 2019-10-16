<?php
include 'simple_html_dom.php';

if($_REQUEST['action'] == 'getPollingInfo'){
    // TODO: Validate and sanitize this input.
    $postalCode = $_REQUEST['postalCode'];
    $province = $_REQUEST['province'];

    $electoralDistrict = getElectoralDistrict($postalCode);
    $pollingInfo = getPollingInfo($electoralDistrict, $postalCode, $province);
    $pollingInfo->candidates = getCandidates($electoralDistrict, $postalCode, $province);

    echo json_encode($pollingInfo);
}

/**
 * Queries elections.ca to get the electoral district related to the postal code.
 * @param string $postalCode The user's postal code.
 */
function getElectoralDistrict($postalCode){
    $url = 'https://www.elections.ca/results2.asp?mysent=finded&mylang=e&pc={postalcode}';
    $url = str_replace('{postalcode}', $postalCode, $url);
    $html = file_get_html($url);

    $href = $html->find('a[class=current]', 0)->href;
    $electoralDistrict = substr($href, 31, 5);
    return $electoralDistrict;
}

/**
 * Scrapes polling station info from elections.ca using a postal code and province as query parameters.
 * 
 * @param string $postalCode The user's postal code.
 * @param string $province The user's province.
 * 
 * @return array Returns an array of objects containing key-value pairs that describe a polling station.
 */
function getPollingInfo($electoralDistrict, $postalCode, $province){
    $url = 'https://elections.ca/Scripts/vis/voting?L=e&ED={electoraldistrict}&EV=51&EV_TYPE=1&PC={postalcode}&PROV={province}&PROVID=&MAPID=&QID=3&PAGEID=31&TPAGEID=&PD=&STAT_CODE_ID=15';
    $url = str_replace('{electoraldistrict}', $electoralDistrict, $url);
    $url = str_replace('{postalcode}', $postalCode, $url);
    $url = str_replace('{province}', $province, $url);
    $html = file_get_html($url);
    $pollingInfo = new stdClass();
    
    $pollingInfo->coordinates = $html->find('input[id=coordinate1]', 0) !== null ? $html->find('input[id=coordinate1]', 0)->value : "";
    $pollingStation = array();

    foreach($html->find('div[id=divOrdPoll] ul li') as $info){
        if ($info !== null){
            $pollingStation[] = $info->innertext;
        }
    }
    if (count($pollingStation) == 4){
        $pollingInfo->hours = substr($pollingStation[0], 18, 22);
        $pollingInfo->name = $pollingStation[1];
        $pollingInfo->address = $pollingStation[2];
        $pollingInfo->city = $pollingStation[3];
    }

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
function getCandidates($electoralDistrict, $postalCode, $province){
    $url = 'https://elections.ca/Scripts/vis/candidates?L=e&ED={electoraldistrict}&EV=51&EV_TYPE=1&PC={postalCode}&PROV={province}&PROVID=35&QID=-1&PAGEID=17';
    $url = str_replace('{electoraldistrict}', $electoralDistrict, $url);
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