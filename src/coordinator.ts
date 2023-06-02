import express from "express";

class Coordinator {
  private readonly app: express.Express;

  constructor() {
    this.app = express();
  }

}
