function msgReceived(msg){
  if(msg.challenger) {
    $challenger.html("your challenger is " + msg.challenger);
  };
}

$(document).ready(function () {
  var socket = io.connect();
  socket.on('message', function(msg){msgReceived(msg);});
});
