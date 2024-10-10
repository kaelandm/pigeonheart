const config = {
  type: Phaser.AUTO,
  width: 6 * 64,
  height: 6 * 64,
  parent: "phaser-example",
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let players = {};

function preload() {
  this.load.image("tiles", "images/new/tileset.png");
  this.load.image("pigeon1", "images/new/player1piece.png");
  this.load.image("pigeon2", "images/new/player2piece.png");
  this.load.image("pushIndicator", "images/new/targetindicator.png");
  this.load.image("targetIndicator", "images/new/pushindicator.png");
}

function create() {
  const socket = io();
  const phaser = this;
  const tilesize = 64;

  // update the grid
  let gridmap = [];

  socket.on("gridUpdate", (grid) => {
    gridmap = grid;
    const map = phaser.make.tilemap({
      data: gridmap,
      tileWidth: tilesize,
      tileHeight: tilesize,
    });
    const tileset = map.addTilesetImage("tiles");
    const layer = map.createLayer(0, tileset, 0, 0);
  });

  //// Listeners

  phaser.input.keyboard.on("keydown-A", (event) => {
    socket.emit("move", "left");
  });
  //  Right
  phaser.input.keyboard.on("keydown-D", (event) => {
    socket.emit("move", "right");
  });
  //  Up
  phaser.input.keyboard.on("keydown-W", (event) => {
    socket.emit("move", "up");
  });
  //  Down
  phaser.input.keyboard.on("keydown-S", (event) => {
    socket.emit("move", "down");
  });
  phaser.input.keyboard.on("keydown-SPACE", (event) => {
    socket.emit("reset");
  });

  console.log(socket);

  socket.on("currentPlayers", (currentPlayers) => {
    console.log("currentPlayers");
    for (const id in players) {
      players[id].sprite.destroy();
    }

    players = currentPlayers;
    for (const id in players) {
      createPlayer(players[id]);
    }
  });

  socket.on("newPlayer", (playerInfo) => {
    console.log("newPlayer");
    createPlayer(playerInfo);
  });

  socket.on("playerMoved", (player) => {
    if (players[player.id]) {
      players[player.id].sprite.setPosition(
        player.position[0] * tilesize + tilesize / 2,
        player.position[1] * tilesize + tilesize / 2
      );
    }
  });

  socket.on("playerPushing", (player) => {
    phaser.add.image(
      player.position[0] * tilesize + tilesize / 2,
      player.position[1] * tilesize + tilesize / 2,
      "pushIndicator"
    );
    for (var indicator of player.indicators) {
      phaser.add.image(
        indicator[0] * tilesize + tilesize / 2,
        indicator[1] * tilesize + tilesize / 2,
        "targetIndicator"
      );
      console.log(indicator);
    }
  });

  socket.on("playerDisconnected", (id) => {
    if (players[id]) {
      players[id].sprite.destroy();
      delete players[id];
    }
  });

  function createPlayer(playerInfo) {
    const sprite = phaser.add.sprite(
      playerInfo.position[0] * tilesize + tilesize / 2,
      playerInfo.position[1] * tilesize + tilesize / 2,
      playerInfo.id === Object.keys(players)[0] ? "pigeon1" : "pigeon2"
    );
    playerInfo.sprite = sprite;
    players[playerInfo.id] = playerInfo;
    sprite.setDepth(1);
  }
}

function update() {}
