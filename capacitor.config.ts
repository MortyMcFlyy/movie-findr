import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'MovieFindr',
  webDir: 'www',
  plugins: {
    EdgeToEdge: {
      backgroundColor: "#000000ff",
    },
  },
};

export default config;
