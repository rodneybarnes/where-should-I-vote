<?php
include 'simple_html_dom.php';

if($_REQUEST['action'] == 'getPollingInfo'){
    $postalCode = $_REQUEST['postalCode'];
    $province = $_REQUEST['province'];
    $url = 'https://elections.ca/Scripts/vis/voting?L=e&ED=35035&EV=51&EV_TYPE=1&PC={postalcode}&PROV={province}&PROVID=35&MAPID=&QID=3&PAGEID=31&TPAGEID=&PD=&STAT_CODE_ID=15';
    $url = str_replace('{postalcode}', $postalCode, $url);
    $url = str_replace('{province}', $province, $url);
    $html = file_get_html($url);
    $pollingInfo = array();

    $pollingInfo[] = array('coordinates' => $html->find('input[id=coordinate1]', 0)->value);
    $pollingStation = array();

    foreach($html->find('div[id=divOrdPoll] ul li') as $info){
        $pollingStation[] = $info->innertext;
    }
    $pollingInfo[] = array('hours' => substr($pollingStation[0], 18, 22));
    $pollingInfo[] = array('name' => $pollingStation[1]);
    $pollingInfo[] = array('address' => $pollingStation[2]);
    $pollingInfo[] = array('city' => $pollingStation[3]);
    $pollingInfo[] = array('candidates' => getCandidates($postalCode, $province));

    //echo json_encode(getCandidates($postalCode, $province));
    echo json_encode($pollingInfo);
}

function getCandidates($postalCode, $province){
    $url = 'https://elections.ca/Scripts/vis/candidates?L=e&ED=35035&EV=51&EV_TYPE=1&PC={postalCode}&PROV={province}&PROVID=35&QID=-1&PAGEID=17';
    $url = str_replace('{postalcode}', $postalCode, $url);
    $url = str_replace('{province}', $province, $url);
    $html = file_get_html($url);
    $candidateInfo = array();
    $candidates = array();

    foreach($html->find('table tr') as $candidate){
        $candidates[] = $candidate;
    }
    array_shift($candidates);   // We don't need the table headers.
    foreach($candidates as $candidate){
        $candidateArray = array();
        $candidateArray[] = array('name' => trim($candidate->find('td', 0)->innertext));
        $candidateArray[] = array('party' => trim($candidate->find('td', 2)->innertext));
        $candidateArray[] = array('phone' => trim($candidate->find('td', 3)->innertext));
        if(isset($candidate->find('td a[href]', 0)->href))
            $candidateArray[] = array('website' => trim($candidate->find('td a[href]', 0)->href));
        $candidateInfo[] = $candidateArray;
    }
    return $candidateInfo;
}


?>