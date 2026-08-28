/** Replace with your GoDaddy affiliate ISC code from the GoDaddy affiliate dashboard. */
export const GODADDY_AFFILIATE_ISC = "";

/** Domain search landing page for Domain Compare "Buy" clicks. */
export const GODADDY_DOMAIN_AFFILIATE_URL = GODADDY_AFFILIATE_ISC
  ? `https://www.godaddy.com/domainsearch/find?checkAvail=1&isc=${GODADDY_AFFILIATE_ISC}`
  : "https://www.godaddy.com/domainsearch/find?checkAvail=1";
