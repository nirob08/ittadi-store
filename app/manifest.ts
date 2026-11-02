import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ittadi Store',
    short_name: 'Ittadi',
    description: 'Thoughtful gifts, home decor and everyday delights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f6',
    theme_color: '#24352c',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
