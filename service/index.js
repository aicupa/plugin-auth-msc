const { createPlugin } = require('@aicupa/api')
const path = require('path')
const os = require('os')

module.exports = createPlugin((api) => {
  const dataPath = path.join(os.homedir(), '.todoListNative', 'plugins', '.plugin-auth-msc.json')

  async function loadData() {
    try {
      const content = await api.readFile(dataPath)
      return JSON.parse(content)
    } catch {
      return { secret: '' }
    }
  }

  async function saveData(data) {
    await api.writeFile(dataPath, JSON.stringify(data))
  }

  return {
    async getSecret() {
      const data = await loadData()
      return { ok: true, result: data }
    },

    async saveSecret(params) {
      await saveData({ secret: params.secret })
      return { ok: true }
    },

    async clearSecret() {
      await saveData({ secret: '' })
      return { ok: true }
    },
  }
})
