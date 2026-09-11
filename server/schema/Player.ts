import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") userId = "";
  @type("string") petId = "";
  @type("string") petName = "";
  @type("number") x = 500;
  @type("number") y = 300;
  @type("string") direction = "down";
}
