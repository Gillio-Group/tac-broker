/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/gunbroker-sb/sbpics/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/gunbroker/sbpics/**',
      },
    ],
  },
  // Allow build to succeed even with ESLint errors
  eslint: {
    // Warning instead of error for linting issues
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Dangerously allow production builds to succeed even with type errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 