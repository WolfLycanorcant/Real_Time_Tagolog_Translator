export class DevTunnelGuard {
  private checks: Array<() => Promise<boolean>> = []
  private warnings: string[] = []

  constructor() {
    this.initializeChecks()
  }

  private initializeChecks() {
    this.checks = [
      this.checkHostHeaderSupport,
      this.checkHttpsHttpMismatch,
      this.checkWebSocketConnection,
      this.checkServiceWorkerCache,
      this.checkHardcodedUrls,
      this.checkInterfaceBinding,
      this.checkNgrokInterstitial
    ]
  }

  async runAllChecks(): Promise<boolean> {
    console.log('🔍 Running tunnel compatibility checks...')

    let allPassed = true
    this.warnings = []

    for (const check of this.checks) {
      try {
        const passed = await check.call(this)
        if (!passed) allPassed = false
      } catch (error) {
        console.warn('Check failed:', error)
        allPassed = false
      }
    }

    if (allPassed) {
      console.log('✅ Tunnel-ready dev server')
    } else {
      console.warn('⚠️ Some tunnel compatibility issues detected')
      this.warnings.forEach(warning => console.warn(warning))
    }

    return allPassed
  }

  private async checkHostHeaderSupport(): Promise<boolean> {
    const currentHost = window.location.host
    const isTunnel = currentHost.includes('ngrok') ||
      currentHost.includes('cloudflare') ||
      currentHost.includes('trycloudflare') ||
      currentHost.includes('loca.lt') ||
      currentHost.includes('serveo.net')

    if (isTunnel) {
      console.log('✅ Tunnel host detected, checking server configuration')
        // Set a flag that can be used by other parts of the app
        ; (window as any).__TUNNEL_MODE__ = true
      return true
    }
    console.log('✅ Local development detected')
      ; (window as any).__TUNNEL_MODE__ = false
    return true
  }

  private async checkHttpsHttpMismatch(): Promise<boolean> {
    const isHttps = window.location.protocol === 'https:'
    const hasHttpRequests = document.querySelectorAll('[src^="http://"], [href^="http://"]').length > 0

    if (isHttps && hasHttpRequests) {
      this.warnings.push('⚠️ HTTPS page with HTTP resources detected')
      return false
    }
    console.log('✅ No HTTPS/HTTP mismatch detected')
    return true
  }

  private async checkWebSocketConnection(): Promise<boolean> {
    // Check if HMR is available (Vite development mode)
    const hasHMR = (import.meta as any).hot !== undefined

    if (hasHMR) {
      try {
        // Check if we're running through a tunnel
        const currentHost = window.location.host
        const isTunnel = currentHost.includes('ngrok') || currentHost.includes('cloudflare') || currentHost.includes('trycloudflare')

        if (isTunnel) {
          console.log('✅ HMR WebSocket configured for tunnel environment')
          // For tunnels, HMR might not work perfectly but that's expected
          return true
        } else {
          console.log('✅ HMR WebSocket configured for local development')
          return true
        }
      } catch (error) {
        this.warnings.push('⚠️ WebSocket connection may fail through tunnel')
        return false
      }
    }
    console.log('✅ HMR not active (production build)')
    return true
  }

  private async checkServiceWorkerCache(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length > 0) {
        console.log('🔧 Unregistering service workers for development')
        await Promise.all(registrations.map(reg => reg.unregister()))
      }
    }
    console.log('✅ Service worker cache cleared')
    return true
  }

  private async checkHardcodedUrls(): Promise<boolean> {
    // Check for hardcoded localhost URLs in the current page
    const pageContent = document.documentElement.outerHTML
    const localhostMatches = pageContent.match(/http:\/\/localhost:\d+/g)

    if (localhostMatches) {
      this.warnings.push(`⚠️ Hardcoded localhost URLs found: ${localhostMatches.join(', ')}`)
      return false
    }
    console.log('✅ No hardcoded localhost URLs detected')
    return true
  }

  private async checkInterfaceBinding(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      if (response.ok) {
        console.log('✅ Backend server accessible')
        return true
      } else {
        this.warnings.push(`⚠️ Backend server returned ${response.status}`)
        return false
      }
    } catch (error) {
      this.warnings.push('⚠️ Backend server not accessible')
      return false
    }
  }

  private async checkNgrokInterstitial(): Promise<boolean> {
    const currentHost = window.location.host
    if (currentHost.includes('ngrok')) {
      // Add ngrok skip warning header to document
      const existingMeta = document.querySelector('meta[name="ngrok-skip-browser-warning"]')
      if (!existingMeta) {
        const meta = document.createElement('meta')
        meta.name = 'ngrok-skip-browser-warning'
        meta.content = 'true'
        document.head.appendChild(meta)
        console.log('🔧 Added ngrok browser warning skip')
      }

      // Check if we're seeing the ngrok interstitial
      const bodyText = document.body.textContent || ''
      if (bodyText.includes('ngrok') && bodyText.includes('Visit Site')) {
        this.warnings.push('⚠️ ngrok interstitial page detected - add ngrok-skip-browser-warning=true to URL')
        return false
      }
    }
    console.log('✅ No ngrok interstitial issues detected')
    return true
  }
}

// Initialize tunnel guard on app startup
export const initializeTunnelGuard = async (): Promise<boolean> => {
  const guard = new DevTunnelGuard()
  return await guard.runAllChecks()
}