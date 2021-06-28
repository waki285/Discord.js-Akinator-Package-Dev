⚠ This Package is Still in Development! (Find any bugs? Join Our Discord Server, link is at the bottom of this page!)

# Discord.js Akinator

インストールして、数秒以内にはDiscord BotのAkinatorコマンドが作成できます。

UPDATE 2.1.0 - Now includes support for 10 new languages for questions, including French, German, Russian, Turkish and more! Update and use the new `region` parameter to try it out!

# パッケージのインストール

このパッケージをDiscord Botにインストールする方法:

`npm i discord.js-akinator-ja --save`

# サンプル

```js
const discord = require("discord.js");
const akinator = require("discord.js-akinator");
const client = new Discord.Client();

const prefix = "!";

client.on("ready", () => {
    console.log("Discord Bot is active now")
});

client.on("message", async message => {
    if(message.content.startsWith(`${prefix}akinator`)) {
        akinator(message, client, "jp"); //日本語のアキネーター
    }
});

client.login("Discord Bot Token")
```

# Special Thanks

- [Ashish#0540](https://github.com/3061LRTAGSPKJMORMRT) (For error handling and writing much cleaner code. Thanks!)
