/**
 * @param {import('@aicupa/api').PluginApi} api
 * @returns {import('@aicupa/api').Plugin}
 */
module.exports = (api) => {
  const { path, os, crypto } = api;

  const SALT = "plugin-auth-msc-v1";
  const ALGORITHM = "aes-256-gcm";

  function deriveKey() {
    const identity = `${os.hostname()}:${os.userInfo().username}`;
    return crypto.pbkdf2Sync(identity, SALT, 100000, 32, "sha256");
  }

  function encrypt(text) {
    if (!text) return "";
    const key = deriveKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return (
      "enc:" +
      [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(
        ":",
      )
    );
  }

  function decrypt(data) {
    if (!data) return "";
    if (!data.startsWith("enc:")) return data;
    try {
      const [ivHex, tagHex, encHex] = data.slice(4).split(":");
      const key = deriveKey();
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(ivHex, "hex"),
      );
      decipher.setAuthTag(Buffer.from(tagHex, "hex"));
      return decipher.update(encHex, "hex", "utf8") + decipher.final("utf8");
    } catch {
      return "";
    }
  }

  const dataPath = path.join(
    os.homedir(),
    ".todoListNative",
    "plugins",
    ".plugin-auth-msc.json",
  );

  async function loadData() {
    try {
      const content = await api.readFile(dataPath);
      const data = JSON.parse(content);
      return { secret: decrypt(data.secret) };
    } catch {
      return { secret: "" };
    }
  }

  async function saveData(data) {
    await api.writeFile(
      dataPath,
      JSON.stringify({ secret: encrypt(data.secret) }),
    );
  }

  return {
    async getSecret() {
      const data = await loadData();
      return { ok: true, result: data };
    },

    async saveSecret(params) {
      await saveData({ secret: params.secret });
      return { ok: true };
    },

    async clearSecret() {
      await saveData({ secret: "" });
      return { ok: true };
    },
  };
};
