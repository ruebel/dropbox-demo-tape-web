/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dl-web.dropbox.com",
        port: "",
      },
    ],
  },
};

export default nextConfig;
