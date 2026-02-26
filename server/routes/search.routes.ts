import { RouteContext } from "./types";
import { requireAuth, requireRole } from "../auth";
import { storage } from "../storage";
import { z } from "zod";
import { zodErrorResponse } from "../middleware/errors";

export function registerSearchRoutes({ app }: RouteContext) {
  app.get("/api/search", requireAuth, async (req, res) => {
    try {
      const { q = "", types = "conversations,customers,articles,users" } = req.query;
      const query = String(q).trim();
      const typeList = String(types).split(",");

      if (!query) {
        return res.json({
          conversations: [],
          customers: [],
          articles: [],
          users: [],
        });
      }

      const results: any = {};

      const searchPromises = typeList.map(async (type) => {
        switch (type) {
          case "conversations":
            // search title, customer name, recent message content
            results.conversations = await storage.searchConversations(query);
            break;
          case "customers":
            results.customers = await storage.searchCustomers(query);
            break;
          case "articles":
            results.articles = await storage.searchKnowledgeBase(query);
            break;
          case "users":
            // Only admins can search users
            if (req.user && (req.user as any).role === "admin") {
              results.users = await storage.searchUsers(query);
            } else {
              results.users = [];
            }
            break;
        }
      });

      await Promise.all(searchPromises);

      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });
}
