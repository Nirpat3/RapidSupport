import { Router } from "express";
  import { storage } from "../storage";

  const router = Router();

  router.get("/api/portal-manifest", async (req, res) => {
    const orgSlug = req.query.org as string;
    let name = "Nova Support Portal";
    let themeColor = "#059669"; // emerald

    if (orgSlug) {
      try {
        const org = await storage.getOrganizationBySlug(orgSlug);
        if (org) {
          name = `${org.name} Support Portal`;
          if (org.primaryColor) {
            themeColor = org.primaryColor;
          }
        }
      } catch (error) {
        console.error('Error fetching org for manifest:', error);
      }
    }

    const manifest = {
      name: name,
      short_name: name.length > 12 ? "Support" : name,
      description: `Customer support portal for ${name}`,
      start_url: "/portal/dashboard",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: themeColor,
      icons: [
        {
          src: "/icons/icon-72.png",
          sizes: "72x72",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-72.png",
          sizes: "72x72",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/icon-96.png",
          sizes: "96x96",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-96.png",
          sizes: "96x96",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/icon-128.png",
          sizes: "128x128",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-128.png",
          sizes: "128x128",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/icon-144.png",
          sizes: "144x144",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-144.png",
          sizes: "144x144",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/icon-152.png",
          sizes: "152x152",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-152.png",
          sizes: "152x152",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/icon-384.png",
          sizes: "384x384",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-384.png",
          sizes: "384x384",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
      shortcuts: [
        {
          name: "Dashboard",
          url: "/portal/dashboard",
          icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }]
        },
        {
          name: "Conversations",
          url: "/portal/conversations",
          icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }]
        },
        {
          name: "Knowledge Base",
          url: "/portal/knowledge-base",
          icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }]
        },
        {
          name: "Announcements",
          url: "/portal/communication/announcements",
          icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }]
        }
      ]
    };

    res.setHeader("Content-Type", "application/manifest+json");
    res.json(manifest);
  });

  export default router;