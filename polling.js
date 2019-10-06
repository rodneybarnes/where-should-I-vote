$(document).ready(function() {
  $.get(
    'polling.php',
    { action: 'getPollingStations' },
    function(data) {
      $('#results').html(data)
      //let el = $('<div></div>')
      //el.html(data)
      console.log(data.search('<body>'))
      console.log(data.search('</body>'))
    },
    'html'
  )
})
