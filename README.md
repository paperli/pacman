# PAC-MAN 3D FPS Remake

A first-person PAC-MAN remake built with Babylon.js. Navigate a classic maze, collect pellets, avoid ghosts, and chase high scores—all in immersive 3D!

---

## 🚀 Setup & Launch

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)

### **Installation**
```sh
# Clone the repository
git clone <your-repo-url>
cd pacman

# Install dependencies
yarn install  # or npm install
```

### **Running the Game**
```sh
yarn start    # or npm start
```
- Open your browser and go to [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal).
- Click the game canvas to lock the pointer and start playing.

---

## 🎮 Controls
- **WASD**: Move
- **Mouse**: Look around
- **M**: Toggle map view (debug)
- **P**: Show A* path (debug)

---

## 🛠️ Development
- Main game logic: `src/index.js`
- Maze, pellet, and ghost configuration are at the top of the file.
- To change visuals, edit Babylon.js mesh/material code in `src/index.js`.
- For custom assets, place them in `src/assets/`.

---

Enjoy the game! Contributions and feedback are welcome. 

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. 