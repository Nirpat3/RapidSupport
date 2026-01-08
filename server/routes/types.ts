import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import type ChatWebSocketServer from "../websocket";

export interface RouteContext {
  app: Express;
  httpServer: Server;
  wsServer: ChatWebSocketServer;
}

export type RouteHandler = (req: Request, res: Response, next?: NextFunction) => void | Promise<void>;

export type RouteRegistrar = (context: RouteContext) => void;
