const server = require("http").createServer(); // STEP 1 ::=> HTTP Server object
const io = require("socket.io")(server); // STEP 2 ::=> Bind socket.io to http server so after http connection the bidirectional communication keep up using web sockets.

server.listen(5000); // 3 ::=> Staring HTTP server which will be consumed by clients
console.log("listening to : 5000 ");

// Generate Game ID
var players = {},
  unmatched,
  rooms = {};

io.sockets.on("connection", function (socket) {
  console.log("socket connected");
  socket.emit("connects", { msg: "hello" });

  socket.on("newGame", handelNewGame);
  function handelNewGame() {
    let roomid = Math.floor(1000 + Math.random() * 9000);
    joinGame(socket);
    rooms[roomid] = {
      Id: roomid,
      Participant1: players[socket.id],
      Participant2: null,
      unmatched: unmatched,
    };
    socket.emit("roomcode", roomid);
  }

  socket.on("enterGame", handelEnterGame);
  function handelEnterGame(roomId) {
    if (rooms[roomId]) {
      joinGame2(socket, roomId);
    } else {
      console.log("no room with this id exist");
    }
    if (
      rooms[roomId].Participant1 != null &&
      rooms[roomId].Participant2 != null
    ) {
      rooms[roomId].Participant1.socket.emit("enterroomcode", "entered room");
      rooms[roomId].Participant2.socket.emit("enterroomcode", "entered room");
      console.log("sent");
    }
  }
  function joinGame2(socket, id) {
    players[socket.id] = {
      opponent: unmatched,
      roomid: id,
      symbol: "X",
      // The socket that is associated with this player
      socket: socket,
    };
    if (rooms[id].unmatched) {
      players[socket.id].symbol = "O";

      rooms[id].Participant1.opponent = socket.id;
      rooms[id].Participant2 = players[socket.id];
      rooms[id].Participant2.opponent = rooms[id].unmatched;
      rooms[id].Participant1.roomid = id;
      players[rooms[id].unmatched].opponent = socket.id;
      players[rooms[id].unmatched].roomid = id;
      players[socket.id].opponent = rooms[id].unmatched;
      rooms[id].unmatched = null;
    } else {
      rooms[id].unmatched = socket.id;
    }
  }
  if (
    socket.on("begin", (data) => {
      if (data) {
        if (getOpponent(socket)) {
          socket.emit("game.begin", {
            symbol: players[socket.id].symbol,
          });
          getOpponent(socket).emit("game.begin", {
            symbol: players[getOpponent(socket).id].symbol,
          });
        }

        socket.on("make.move", function (data) {
          if (!getOpponent(socket)) {
            return;
          }
          socket.emit("move.made", data);
          getOpponent(socket).emit("move.made", data);
        });

        socket.on("disconnect", function () {
          if (getOpponent(socket)) {
            getOpponent(socket).emit("opponent.left");
          }
        });
      }
    })
  );
  socket.on("result", (data) => {
    if (data === "Game over. You Lost!") {
      getOpponent(socket).emit("userResult", data);
      socket.emit("userResult", "Game over. You won!");
    } else if (data === "Game over. You won!") {
      getOpponent(socket).emit("userResult", data);
      socket.emit("userResult", "Game over. You Lost!");
    } else {
      socket.emit("userResult", data);
    }
  });
});

function joinGame(socket) {
  players[socket.id] = {
    opponent: unmatched,
    roomid: "",
    symbol: "X",
    // The socket that is associated with this player
    socket: socket,
  };
  if (unmatched) {
    players[socket.id].symbol = "O";
    players[unmatched].opponent = socket.id;
    unmatched = null;
  } else {
    unmatched = socket.id;
  }
}
function getOpponent(socket) {
  if (!players[socket.id].opponent) {
    return;
  }
  return players[players[socket.id].opponent].socket;
}
