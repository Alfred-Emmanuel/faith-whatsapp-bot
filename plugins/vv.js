const { bot, setVar, getVars, parsedJid, isGroup } = require("../lib");

bot(
  {
    pattern: "vv ?(.*)",
    desc: "Extract view-once media. Usage: vv [jid] | vv set <jid> (sets default)",
    type: "download",
  },
  async (message, match) => {
    match = (match || "").trim();

    // Handle setting a default JID
    if (match.toLowerCase().startsWith("set")) {
      const jid = parsedJid(match.replace(/^set\s+/i, ""))[0];
      if (!jid) return await message.send("Usage: vv set <jid>");

      if (isGroup(jid)) {
        try {
          await message.groupMetadata(jid);
        } catch {
          return await message.send("Invalid group JID");
        }
      } else {
        const exist = await message.onWhatsapp(jid);
        if (!exist) return await message.send("Invalid JID");
      }

      const resp = await message.send(`VV_JID set to ${jid}`);
      await setVar({ VV_JID: jid }, message.id);

      // Auto-delete confirmation and the command message
      try {
        await message.send(resp.key, {}, "delete");
      } catch {}
      try {
        await message.send(message.key, {}, "delete");
      } catch {}

      return;
    }

    // Resolve target JID (argument or saved default)
    const vars = await getVars(message.id);
    const targetJid = parsedJid(match)[0] || vars["VV_JID"];
    if (!targetJid) {
      return await message.send(
        "Reply to a view-once image/video and use: vv [jid]\nOr set default: vv set <jid>"
      );
    }

    if (!message.reply_message) {
      return await message.send("Reply to a view-once image/video");
    }

    // Download replied media (works for view-once)
    let mediaPath;
    try {
      mediaPath = await message.reply_message.downloadAndSaveMediaMessage("vv");
    } catch {
      return await message.send(
        "Failed to fetch media. Make sure you replied to a view-once message."
      );
    }

    const type = message.reply_message.image
      ? "image"
      : message.reply_message.video
      ? "video"
      : "";
    if (!type) return await message.send("Unsupported message type");

    // Send to target JID
    await message.send(mediaPath, {}, type, targetJid);

    // Auto-delete the command message
    try {
      await message.send(message.key, {}, "delete");
    } catch {}
  }
);
