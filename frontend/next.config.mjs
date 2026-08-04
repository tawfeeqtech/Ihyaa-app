import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/config/i18n/request.js");

const nextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
