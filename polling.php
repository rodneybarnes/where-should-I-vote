<?php

if($_REQUEST['action']){
    $response = file_get_contents('https://elections.ca/Scripts/vis/voting?L=e&ED=35035&EV=51&EV_TYPE=1&PC=L8L6S9&PROV=ON&PROVID=35&MAPID=&QID=3&PAGEID=31&TPAGEID=&PD=&STAT_CODE_ID=15');
    // $response = "test";
    echo $response;
}


?>