const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files if needed (e.g., HTML, CSS, JS)
app.use(express.static("public")); // Create a 'public' folder for static assets

let players = {};
/*
  "id": {
    "id": string;
    "position": number[];
    "status": "pushing" | "moving"
  }
*/

let grid = [
  [1, 0, 1, 1, 0, 2],
  [0, 1, 1, 1, 3, 0],
  [1, 1, 3, 2, 1, 1],
  [1, 1, 2, 3, 1, 1],
  [0, 3, 1, 1, 2, 0],
  [2, 0, 1, 1, 0, 1],
];

// Handle Socket.IO connections
io.on("connection", (socket) => {
  const isFirstPlayer = Object.keys(players).length === 0;
  players[socket.id] = {
    id: socket.id,
    position: isFirstPlayer ? [0, 0] : [5, 5],
    status: "moving",
    object: 0,
    score: 0,
    indicators: [],
  };
  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", players[socket.id]);

  // send initial grid data
  io.emit("gridUpdate", grid);

  socket.on("move", (msg) => {
    const player = players[socket.id];

    let movementVector = [0, 0];

    if (msg === "left") {
      movementVector = [0, -1];
    }
    if (msg === "right") {
      movementVector = [0, 1];
    }
    if (msg === "up") {
      movementVector = [-1, 0];
    }
    if (msg === "down") {
      movementVector = [1, 0];
    }
    const targetTile = [
      player.position[0] + movementVector[1],
      player.position[1] + movementVector[0],
    ];

    if (player.status === "pushing") {
      // if you push an object off the side of the stage, get points
      if (
        targetTile[0] < 0 ||
        targetTile[1] < 0 ||
        targetTile[0] > 5 ||
        targetTile[1] > 5
      ) {
        player.score += player.object;
      } else {
        let targetGrid = grid[targetTile[1]][targetTile[0]];
        // if the tile you're pushing the object to is empty, the object just moves there
        if (targetGrid === 0) {
          grid[targetTile[1]][targetTile[0]] = player.object;
        }
        // if the tile is the same type of object as the current one, they combine
        else if (targetGrid === player.object) {
          grid[targetTile[1]][targetTile[0]] += 1;
          // if you combine two eggs, get points and remove the eggs
          if (grid[targetTile[1]][targetTile[0]] === 4) {
            grid[targetTile[1]][targetTile[0]] = 0;
            player.score += 5;
          }
        }
        // if the tile is a smaller object than the current one, the larger object "eats" the smaller one
        else if (targetGrid < player.object) {
          grid[targetTile[1]][targetTile[0]] = player.object;
        }
      }
      io.emit("playerMoved", player);
      player.object = 0;
      io.emit("gridUpdate", grid);
      player.status = "moving";
    } else if (player.status === "moving") {
      // if you try to move out of bounds, nothing happens
      if (
        targetTile[0] < 0 ||
        targetTile[1] < 0 ||
        targetTile[0] > 5 ||
        targetTile[1] > 5
      ) {
        return;
      }

      // remember the object on the tile the player is stepping onto
      player.object = grid[targetTile[1]][targetTile[0]];
      grid[targetTile[1]][targetTile[0]] = 0;
      // if the player is stepping onto a non-empty tile, enter pushing mode
      if (player.object != 0) {
        player.status = "pushing";
        player.position = targetTile;
        player.indicators = [
          [targetTile[0] + 1, targetTile[1]],
          [targetTile[0] - 1, targetTile[1]],
          [targetTile[0], targetTile[1] - 1],
          [targetTile[0], targetTile[1] + 1],
        ];
        io.emit("playerPushing", player);
      } else {
        player.position = targetTile;
        io.emit("playerMoved", player);
      }

      // check if there are still objects on the grid. if there are no more objects, the game ends
      let allZeros = true;
      grid.forEach((innerArray) => {
        innerArray.forEach((number) => {
          if (number !== 0) {
            allZeros = false;
          }
        });
      });
      if (allZeros === true) {
        console.log("player score: ");
        console.log(players[socket.id].score);
        player.status = "end";
      }
    }
  });

  socket.on("reset", () => {
    for (const playerId in players) {
      if (players.hasOwnProperty(playerId)) {
        players[playerId].score = 0;
        const isFirstPlayer = Object.keys(players).findIndex((value) => {
          value === playerId;
        });
        players[playerId].position = isFirstPlayer ? [0, 0] : [5, 5];
      }
    }
    grid = [
      [1, 0, 1, 1, 0, 2],
      [0, 1, 1, 1, 3, 0],
      [1, 1, 3, 2, 1, 1],
      [1, 1, 2, 3, 1, 1],
      [0, 3, 1, 1, 2, 0],
      [2, 0, 1, 1, 0, 1],
    ];

    io.emit("gridUpdate", grid);
    socket.emit("currentPlayers", players);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
