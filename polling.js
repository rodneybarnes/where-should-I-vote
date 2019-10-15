$(document).ready(function() {

  const key = 'AkpqQWmpsJQMgLXtKOlvLRJa1VQKsvVtQJCbVDHwHfV1Vl05N4wviEjYoKZllQ8g'
  // Regex source: https://howtodoinjava.com/regex/canada-postal-code-validation/
  const postalCodeRegex = new RegExp(/^(?!.*[DFIOQU])[A-VXY][0-9][A-Z] ?[0-9][A-Z][0-9]$/)

  let map,
    layer,
    userLocation,
    directionsManager,
    pollingStationLatitude,
    pollingStationLongitude
  let areDirectionsVisible = false

  // Event listeners
  $('#search-btn').click(startSearch)
  $('form').submit(function(e){
    e.preventDefault()
    startSearch()
  })
  $('#get-current-location-btn').click(searchByUserLocation)
  $('#show-directions-btn').click(function(){
    if(!areDirectionsVisible){
      getDirections(pollingStationLatitude, pollingStationLongitude)
      $('#directions-list').show()
      $('#show-directions-btn').html('Hide Directions')
      areDirectionsVisible = true
    } else {
      clearDirections()
      $('#directions-list').hide()
      $('#show-directions-btn').html('Show Directions')
      areDirectionsVisible = false
    }
    
  })

  /**
   * Validates the user input and, if valid, initiates the search.
   */
  function startSearch(){
    let query = $('#search-input').val()
    if(query !== null && query !== '' && query !== undefined){
      toggleSearchInProgress(true)
      searchByQuery(query)
    }
  }

  /**
   * Triggers a search for polling information using the user's search input.
   * @param {string} query The user's search input.
   */
  function searchByQuery(query){
    let url = 'https://dev.virtualearth.net/REST/v1/Locations?countryRegion=CA&addressLine={query}&key={key}'
    query = query.toUpperCase()

    // If the user input was a postal code, we must pass that into the postalCode parameter and not the addressLine parameter
    if(postalCodeRegex.test(query)){
      query = "&postalCode="+query
    }
    url = url.replace('{query}', query).replace('{key}', key)
    doSearch(url)
  }

  /**
   * Triggers a search for polling information using the user's current geolocation coordinates.
   */
  function searchByUserLocation(){
    /**
     * The function executed if the user's position has been successfully found.
     * Sets the metadata for the pin.
     * @param {Number} position The user's coordinates.
     */
    function locationSuccess(position) {
      const coordinates = position.coords.latitude + ',' + position.coords.longitude
      let url = 'https://dev.virtualearth.net/REST/v1/Locations/{point}?key={key}'
      url = url.replace('{point}', coordinates).replace('{key}', key)
      doSearch(url)
    }

    /**
     * Executed should the attempt to find the user's location fail.
     * Displays the error data in the error div.
     * @param {string} err The error details
     */
    function locationError(err) {
      showErrorMessage('Error finding your location: ' + err.message)
    }
    navigator.geolocation.getCurrentPosition(locationSuccess, locationError)
  }

  /**
   * Queries a Bing Maps REST API endpoint for user location info and sets in motion the population of the cards with the returned data.
   * @param {string} url The Bing Maps REST API endpoint with query params set.
   */
  function doSearch(url){
    resetMapVariables()
    // I had trouble accessing the Bing Maps Rest API from a server that used SSL; this blog post helped with that:
    // https://blogs.bing.com/maps/2015/03/05/accessing-the-bing-maps-rest-services-from-various-javascript-frameworks
    $.ajax({
      url: url,
      datatype: 'jsonp',
      jsonp: 'jsonp',
      success: function (r){
        // console.log(r)
        toggleSearchInProgress(true)
        if(r.resourceSets[0].resources[0].address.postalCode === undefined || r.resourceSets[0].resources[0].address.adminDistrict === undefined){
          showErrorMessage('Sorry, we could not find information related to this location.')
          return false
        } 
        const postalCode = r.resourceSets[0].resources[0].address.postalCode.replace(/\s+/g,'')
        // Because the server-side query is so slow, we must do everything we can to ensure its success.
        // In this case, only send in valid Canadian postal codes.
        if (!postalCodeRegex.test(postalCode)){
          showErrorMessage('Sorry, we could not get valid location data from the query you entered.')
          return false
        }
        const province = r.resourceSets[0].resources[0].address.adminDistrict
        getPollingInfo(postalCode, province)
        const latitude = r.resourceSets[0].resources[0].point.coordinates[0]
        const longitude = r.resourceSets[0].resources[0].point.coordinates[1]
        userLocation = new Microsoft.Maps.Location(latitude, longitude)
      },
      error: function (err) {
        showErrorMessage('Something went wrong: ' + err.message)
      }
    })
  }

  /**
   * Queries for polling info related to a postal code and
   * province.
   * @param {string} postalCode The postal code.
   * @param {string} province The province.
   */
  function getPollingInfo(postalCode, province){
    $.get(
      'polling.php',
      { action: 'getPollingInfo', postalCode: postalCode, province: province },
      function(data) {
        try {
          // console.log(data)
          const pollingInfo = jQuery.parseJSON(data)  // Will throw an exception if the data has non-formatted JSON.
          populatePollingInfo(pollingInfo)
          $('#search-feedback').html('')
        } catch (err){
          showErrorMessage('Sorry, the query failed because the information returned could not be properly parsed.')
          console.log(err.message)
        }
        $('.progress').hide();
        
      },
      'html'
    )
  }

  /**
   * Populates the polling station card with the retrieved data.
   * @param {object} data All data related to a polling station.
   */
  function populatePollingInfo(data){
    if(data !== null && data !== undefined){
      $('#ps-name').html(data.name)
      $('#ps-address').html(data.address + ', ' + data.city)
      $('#ps-hours').html('Open: ' + data.hours)
      const coordinates = data.coordinates.split(',')
      pollingStationLatitude = coordinates[0]
      pollingStationLongitude = coordinates[1]
      showMap(pollingStationLatitude, pollingStationLongitude)
      createPushpinAtLocation(userLocation, 'Your location')
      populateCandidates(data.candidates)
      $('#polling-station-card').show()
    }
  }

  /**
   * Populates the candidate card using the retrieved data.
   * @param {Array} candidates The list of candidates.
   */
  function populateCandidates(candidates){
    if(candidates.length > 0){
      candidates.forEach(candidate => {
        let newRow = '<div class="row"><div class="col-12"><hr /></div></div><div class="row mt-2 mb-2"><div class="col-4">{name}</div><div class="col-4 p-0">{party}</div><div class="col-4">{website}</div></div>'
        let website = '<a href="' + candidate.website + '" target="_blank">' + candidate.website + '</a>'
        newRow = newRow.replace('{name}', candidate.name)
          .replace('{party}', candidate.party)
          .replace('{website}', website)
        $('#candidates-card-body').append(newRow)
      })
      $('#candidates-card').show()
    }
  }

  /**
   * Initializes the map centered on the polling station.
   * @param {Number} latitude The latitude of the polling station.
   * @param {Number} longitude The longitude of the polling station.
   */
  function showMap(latitude, longitude) {
    const pollingStationLocation = new Microsoft.Maps.Location(latitude, longitude)
    map = new Microsoft.Maps.Map(document.getElementById('ps-map'), {
      center: pollingStationLocation,
      zoom: 16
    })
    layer = new Microsoft.Maps.Layer()
    clearDirections()
    createPushpinAtLocation(pollingStationLocation, 'Polling Station')
    map.layers.insert(layer)  
  }

  /**
   * Places a pushpin at the given coordinates.
   * @param {Microsoft.Maps.Location} location The Microsoft Maps Location object containing the latitude and longitude coordinates to place the pin.
   * @param {string} title The title for the pushpin.
   */
  function createPushpinAtLocation(location, title) {
    layer.add(new Microsoft.Maps.Pushpin(location, {
      title: title
    }))
  }

  /**
   * Generates the direction itinerary from the user's location (or the default location)
   * to the desired school.
   * @param {Number} latitude The latitude coordinates of the destination.
   * @param {Number} longitude The longitude coordinates of the destination.
   */
  function getDirections(latitude, longitude) {
    if(latitude === null || latitude === undefined || longitude === null || longitude === undefined){
      latitude = pollingStationLatitude
      longitude = pollingStationLongitude
    }
    // Guard clause to catch the possibilty that the user location has not been set.
    if (!userLocation) {
      console.log('Cannot set directions with an unknown user location.')
      return false
    }
    // We will use the Singleton pattern here to help improve the application's efficiency.
    if (!directionsManager) {
      Microsoft.Maps.loadModule('Microsoft.Maps.Directions', function() {
        //Create an instance of the directions manager.
        directionsManager = new Microsoft.Maps.Directions.DirectionsManager(map)
        getDirections(latitude, longitude)
      })
    } else {
      try {
        clearDirections() // Clear any previous directions.
        directionsManager.setRequestOptions({ routeMode: Microsoft.Maps.Directions.RouteMode.walking })
        let userLocationWaypoint = new Microsoft.Maps.Directions.Waypoint({
          address: 'Start',
          location: userLocation
        })
        directionsManager.addWaypoint(userLocationWaypoint)
        let pollingStationlWaypoint = new Microsoft.Maps.Directions.Waypoint({
          address: 'Destination',
          location: new Microsoft.Maps.Location(latitude, longitude)
        })
        directionsManager.addWaypoint(pollingStationlWaypoint)
        directionsManager.setRenderOptions({
          // Set the div where the itinerary will be displayed.
          itineraryContainer: '#directions-list'
        })
        directionsManager.calculateDirections()
      } catch (err){
        console.log(err.message)
      }
    }
  }

  /**
   * Clear the directions itinerary.
   */
  function clearDirections() {
    if (directionsManager) directionsManager.clearAll()
  }

  /**
   * Sets all variables related to the map to null.
   * I found I was having issues when multiple queries were being run in the same session,
   * so this solution treats each query as a complete reset.
   */
  function resetMapVariables(){
    map = null
    layer = null
    directionsManager = null
    userLocation = null
    pollingStationLatitude = null
    pollingStationLongitude = null
  }

  /**
   * Toggles the elements in the DOM to display if a search is in progress.
   * @param {boolean} isInProgress True if search is in progress.
   */
  function toggleSearchInProgress(isInProgress){
    if(isInProgress){
      $('#polling-station-card').hide()
      $('#candidates-card').hide()
      $('#search-feedback').html('<p class="m-0"><small>Searching...</small></p>').removeClass('text-danger').addClass('text-success')
      $('.progress').show();  
    } else {
      $('#search-feedback').html('')
      $('.progress').hide();  
    }
  }

  /**
   * Displays an error message to the page.
   * @param {string} message The error message to display.
   */
  function showErrorMessage(message){
    $('#search-feedback').html('<p class="m-0"><small>'+ message + '</small></p>').removeClass('text-success').addClass('text-danger')
    $('.progress').hide();  
  }

  /**
   * The following block is to set the box shadow for the search bar when it is either in focus or hovered over, and
   * unset it when the focus is blurred or the mouse exits while the input is not in focus.
   * 
   * It's a little extra, but I guess so is this whole application.
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
})
