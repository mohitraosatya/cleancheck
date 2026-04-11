import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow serving uploaded images from /public/uploads
  // When swapping to S3, add the S3 hostname here
  images: {
    remotePatterns: [],
  },
  // Needed for bcryptjs to work in server context
  serverExternalPackages: ['bcryptjs'],
}

export default nextConfig
