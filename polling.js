$(document).ready(function() {

  const key = 'AkpqQWmpsJQMgLXtKOlvLRJa1VQKsvVtQJCbVDHwHfV1Vl05N4wviEjYoKZllQ8g'

  $('#searchBtn').click(getPostalCode)

  function getPollingInfo(postalCode, province){
    console.log('Sending query...')
    $.get(
      'polling.php',
      { action: 'getPollingInfo', postalCode: postalCode, province: province },
      function(data) {
        // $('#results').html(data)
        //let el = $('<div></div>')
        //el.html(data)
        console.log('Received data:')
        console.log(data)
      },
      'html'
    )
  }

  /**
   * Takes the user's input and uses the Bing Maps REST API to translate that input into a postal code
   * and pass that postal code into the polling.php script, which will use it to retrieve the user's
   * polling station info.
   */
  function getPostalCode(){
    let url = 'https://dev.virtualearth.net/REST/v1/Locations?countryRegion=CA&addressLine={query}&key={key}'
    let query = $('#searchInput').val()

    // If the user input was a postal code, we must pass that into the postalCode parameter and not the addressLine parameter
    // Regex source: https://howtodoinjava.com/regex/canada-postal-code-validation/
    const postalCodeRegex = new RegExp(/^(?!.*[DFIOQU])[A-VXY][0-9][A-Z] ?[0-9][A-Z][0-9]$/)
    if(postalCodeRegex.test(query)){
      console.log('postal code was passed')
      query = "&postalCode="+query
    }
    url = url.replace('{query}', query).replace('{key}', key)

    // I had trouble accessing the Bing Maps Rest API from a server that used SSL; this blog post helped with that:
    // https://blogs.bing.com/maps/2015/03/05/accessing-the-bing-maps-rest-services-from-various-javascript-frameworks
    $.ajax({
      url: url,
      datatype: 'jsonp',
      jsonp: 'jsonp',
      success: function (r){
        // console.log(r)
        const postalCode = r.resourceSets[0].resources[0].address.postalCode.replace(/\s+/g,'')
        const province = r.resourceSets[0].resources[0].address.adminDistrict
        getPollingInfo(postalCode, province)
      },
      error: function (e) {
        console.log('Something went wrong: ')
        console.log(e)
      }
    })
  }
  

  /**
   * The following block is to set the box shadow for the search bar when it is either in focus or hovered over, and
   * unset it when the focus is blurred or the mouse exits while the input is not in focus.
   */
  let isInputFocused = false;

  function setBoxShadow(){
    $('#searchbar').css('box-shadow', '0 0 3px rgba(0,0,0,0.16), 0 0 3px rgba(0,0,0,0.23)')
  }

  function unsetBoxShadow(){
    $('#searchbar').css('box-shadow', 'none')
  }

  $('#searchbar input').focus(function(){
    isInputFocused = true
    setBoxShadow()
  }).blur(function(){
    unsetBoxShadow()
    isInputFocused = false
  })

  $('#searchbar').hover(setBoxShadow, function(){
    if(isInputFocused === false)
      unsetBoxShadow()
  })

  let map

  

  function loadMapScenario(){
    getMap()
  }

  /**
   * Initializes the map.
   */
  function getMap() {
    // Center the map on Hamilton, Ontario with an appropriate zoom level so the user
    // can see the entire city.
    console.log('loading map')
    map = new Microsoft.Maps.Map(document.getElementById('ps-map'), {
      center: new Microsoft.Maps.Location(43.2557, -79.8711),
      zoom: 12
    })

  }

})
