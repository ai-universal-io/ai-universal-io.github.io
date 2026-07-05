import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import JavaScriptObfuscator from 'javascript-obfuscator'

// Obfuscates all JS chunks after Vite finishes bundling.
// selfDefending breaks the code if someone reformats/beautifies it.
function obfuscatorPlugin() {
  return {
    name: 'obfuscator',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk' && file.fileName.endsWith('.js')) {
          file.code = JavaScriptObfuscator.obfuscate(file.code, {
            compact: true,
            simplify: true,
            selfDefending: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.5,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.8,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            splitStrings: true,
            splitStringsChunkLength: 8,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            deadCodeInjection: false,
            debugProtection: false,
          }).getObfuscatedCode()
        }
      }
    },
  }
}

export default defineConfig({
  // Repo is ai-universal-io.github.io (user/org Pages site), served at the domain root
  base: '/',
  plugins: [react(), obfuscatorPlugin()],
  build: {
    sourcemap: false,
  },
})
