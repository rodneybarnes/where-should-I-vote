$(document).ready(function() {
  $.get(
    'polling.php',
    { action: 'getPollingStations' },
    function(data) {
      // $('#results').html(data)
      //let el = $('<div></div>')
      //el.html(data)
      console.log(data.search('<body>'))
      console.log(data.search('</body>'))
    },
    'html'
  )

  /**
   * The following block is to set the box shadow for the search bar when it is either in focus or hovered over, and
   * unset it when the focus is blurred or the mouse exits while the input is not in focus.
   */
  let isInputFocused = false;

  function setBoxShadow(){
    $("#searchbar").css("box-shadow", "0 0 3px rgba(0,0,0,0.16), 0 0 3px rgba(0,0,0,0.23)")
  }

  function unsetBoxShadow(){
    $("#searchbar").css("box-shadow", "none")
  }

  $("#searchbar input").focus(function(){
    isInputFocused = true
    setBoxShadow()
  }).blur(function(){
    unsetBoxShadow()
    isInputFocused = false
  })

  $("#searchbar").hover(setBoxShadow, function(){
    if(isInputFocused === false)
      unsetBoxShadow()
  })

})
