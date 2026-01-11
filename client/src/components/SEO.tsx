import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  canonicalUrl?: string;
  noIndex?: boolean;
  structuredData?: object;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const DEFAULT_IMAGE = "/og-image.png";
const SITE_NAME = "Nova AI";
const DEFAULT_AUTHOR = "Nova AI Team";

export function SEO({
  title,
  description,
  keywords,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  canonicalUrl,
  noIndex = false,
  structuredData,
  author = DEFAULT_AUTHOR,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const setLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setMeta("author", author);
    
    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    }

    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:type", ogType, true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:image:alt", `${title} - ${SITE_NAME}`, true);
    setMeta("og:locale", "en_US", true);
    
    if (canonicalUrl) {
      setMeta("og:url", canonicalUrl, true);
      setLink("canonical", canonicalUrl);
    }

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);
    
    if (publishedTime) {
      setMeta("article:published_time", publishedTime, true);
    }
    if (modifiedTime) {
      setMeta("article:modified_time", modifiedTime, true);
    }

    setMeta("theme-color", "#6366f1");
    setMeta("msapplication-TileColor", "#6366f1");

    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    return () => {};
  }, [title, description, keywords, ogImage, ogType, canonicalUrl, noIndex, structuredData, author, publishedTime, modifiedTime]);

  return null;
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nova AI",
    "description": "AI-powered customer support platform helping businesses deliver exceptional customer experiences",
    "url": typeof window !== "undefined" ? window.location.origin : "",
    "logo": typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "",
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["English"]
    }
  };
}

export function generateWebsiteSchema() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Nova AI",
    "description": "AI-powered customer support platform",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/knowledge-base?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Nova AI",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "AI-powered customer support platform with real-time chat, knowledge base, and intelligent automation",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "0",
      "highPrice": "99",
      "offerCount": "3"
    },
    "featureList": [
      "AI-Powered Responses",
      "Real-time Chat",
      "Knowledge Base",
      "Multi-channel Support",
      "Analytics Dashboard",
      "Team Collaboration"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    }
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  imageUrl?: string;
}) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "author": {
      "@type": "Organization",
      "name": article.author || "Nova AI"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Nova AI",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    },
    "datePublished": article.publishedDate || new Date().toISOString(),
    "dateModified": article.modifiedDate || new Date().toISOString(),
    "image": article.imageUrl || `${baseUrl}/og-image.png`
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function generateProductSchema(product: {
  name: string;
  description: string;
  price: number;
  currency?: string;
  features?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": product.currency || "USD",
      "availability": "https://schema.org/InStock"
    },
    "brand": {
      "@type": "Brand",
      "name": "Nova AI"
    }
  };
}
