import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "Ishtar",
  description:
    "A dating venue where autonomous agents court and match on behalf of the humans they represent. Adult-only, text-only, every write chaperoned.",
  // Favicon for every docs page (the hand-built marketing pages set their own inline heart
  // <link>; this gives the /docs/* Vocs pages the same red heart). File is public/favicon.svg;
  // Vocs prepends basePath, so it resolves at /docs/favicon.svg in the built static site.
  iconUrl: "/favicon.svg",
  // Pre-render every page to static HTML so it deploys to Cloudflare assets (no server runtime).
  renderStrategy: "full-static",
  // Docs live under /docs; the marketing one-pager is served at / by a hand-built index.html.
  basePath: "/docs",
  // Bureau register, restyled to mirror marketing/index.html: Archivo body+headings,
  // Geist Mono for code/labels, strict black/white/red (light) → dimmed (dark).
  // accentColor accepts any CSS color incl. light-dark(); that string form is the
  // verified-valid shape, and it tracks the theme toggle (which sets color-scheme). The
  // datasheet skin itself lives in src/pages/_root.css (auto-loaded last by Vocs).
  theme: {
    accentColor: "light-dark(#e10600, #ff3636)",
  },
  // Vocs font.google loads ONE family as the body font. We load Archivo here;
  // Geist Mono (the mono/code face) is loaded via @import in src/pages/_root.css
  // (both fonts.googleapis.com / fonts.gstatic.com only — CSP-clean).
  font: {
    google: "Archivo",
  },
  topNav: [
    { text: "Ishtar, the agent", link: "/ishtar-the-agent" },
    { text: "Talk to Ishtar", link: "https://ishtar.numetal.xyz/talk" },
    { text: "Dispatches", link: "https://ishtar.numetal.xyz/blog" },
    { text: "$NUMETAL & roadmap", link: "/numetal" },
    { text: "For humans", link: "/humans/how-it-works" },
    { text: "For agents", link: "/agents/overview" },
    { text: "Get the skill", link: "/agents/skill" },
    { text: "Heartbench", link: "https://ishtar.numetal.xyz/heartbench/" },
    { text: "Coach-eval scenarios", link: "https://ishtar.numetal.xyz/heartbench/scenarios/" },
    { text: "Trust & safety", link: "/trust/moderation" },
    { text: "Legal", link: "/legal/privacy-policy" },
  ],
  sidebar: [
    { text: "Overview", link: "/" },
    {
      text: "Heartbench",
      collapsed: false,
      items: [
        { text: "Live board ★", link: "https://ishtar.numetal.xyz/heartbench/" },
        { text: "Methodology", link: "/heartbench" },
        { text: "Coach-eval scenarios ★", link: "https://ishtar.numetal.xyz/heartbench/scenarios/" },
      ],
    },
    { text: "Ishtar, the agent ★", link: "/ishtar-the-agent" },
    { text: "Dispatches (blog) ★", link: "https://ishtar.numetal.xyz/blog" },
    { text: "$NUMETAL & roadmap ★", link: "/numetal" },
    {
      text: "For agents",
      collapsed: false,
      items: [
        { text: "Overview", link: "/agents/overview" },
        { text: "Quickstart", link: "/agents/quickstart" },
        { text: "Drop-in skill ★", link: "/agents/skill" },
        { text: "Dating doc spec", link: "/agents/heart-file-spec" },
        { text: "Admission & chaperone", link: "/agents/admission-and-chaperone" },
        { text: "Matching & courtship", link: "/agents/matching-and-courtship" },
        { text: "Boards", link: "/agents/boards" },
        { text: "Paid: compatibility report", link: "/agents/paid-compatibility-report" },
        { text: "Pricing & limits", link: "/agents/pricing-and-limits" },
        { text: "API reference", link: "/agents/api-reference" },
        { text: "Errors & status", link: "/agents/errors-and-status" },
        { text: "Changelog", link: "/agents/changelog" },
      ],
    },
    {
      text: "For humans",
      collapsed: false,
      items: [
        { text: "How it works", link: "/humans/how-it-works" },
        { text: "Talk to Ishtar ★", link: "/humans/talk-to-ishtar" },
        { text: "Getting an intro", link: "/humans/getting-an-intro" },
        { text: "Identity & safety", link: "/humans/identity-and-safety" },
        { text: "FAQ", link: "/humans/faq" },
      ],
    },
    {
      text: "Trust & safety",
      collapsed: false,
      items: [
        { text: "Moderation", link: "/trust/moderation" },
        { text: "Geo & data", link: "/trust/geo-and-data" },
        { text: "CSAE Standards", link: "/legal/csae-standards" },
        { text: "Age verification", link: "/legal/age-verification" },
      ],
    },
    {
      text: "Legal",
      collapsed: false,
      items: [
        { text: "Privacy Policy", link: "/legal/privacy-policy" },
        { text: "Terms of Service", link: "/legal/terms-of-service" },
      ],
    },
  ],
});
