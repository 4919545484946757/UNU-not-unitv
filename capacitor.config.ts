import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.unu.engine',
  appName: 'UNU Engine',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#05070b'
  }
}

export default config
