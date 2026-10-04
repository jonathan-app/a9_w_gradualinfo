import siteMetadata from "./siteMetaData";

// Only platforms that actually have a profile are exposed, so the header and
// footer never render `<a href="">` links back to the current page.
const PROFILES = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "github", label: "GitHub" },
  { key: "dribbble", label: "Dribbble" },
];

export const socialProfiles = PROFILES.filter(({ key }) =>
  Boolean(siteMetadata[key])
).map(({ key, label }) => ({ key, label, url: siteMetadata[key] }));

export const whatsappLink = siteMetadata.whatsapp
  ? `${siteMetadata.whatsapp}?text=${encodeURIComponent(
      siteMetadata.whatsappMessage
    )}`
  : "";