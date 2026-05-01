const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

exports.default = async function afterPackIcon(context) {
  if (context.electronPlatformName !== 'win32') return

  const projectDir = context.packager.projectDir
  const appName = `${context.packager.appInfo.productFilename}.exe`
  const exePath = path.join(context.appOutDir, appName)
  const iconPath = path.join(projectDir, 'ico.ico')
  const rceditPath = path.join(projectDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe')

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath) || !fs.existsSync(rceditPath)) {
    return
  }

  execFileSync(rceditPath, [exePath, '--set-icon', iconPath], { stdio: 'inherit' })
}
