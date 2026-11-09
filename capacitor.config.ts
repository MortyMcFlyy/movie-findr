import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.felixverena.moviefindr',
  appName: 'MovieFindr',
  webDir: 'www',
  plugins: {
    EdgeToEdge: {
      backgroundColor: "#000000ff",
    },
  },
};

export default config;
