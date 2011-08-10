function msgReceived(msg){
  $clientCounter.html(msg.clients);
}

$(document).ready(function () {
  $clientCounter = $("#client_count");

  var socket = new io.Socket(null, {port: 3000});
  socket.connect();
  socket.on('message', function(msg){
    msgReceived(msg);
  });
});
