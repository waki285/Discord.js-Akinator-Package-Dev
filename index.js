const Discord = require("discord.js");
const { Aki } = require("aki-api");
const games = new Set();
const attemptingGuess = new Set();

/**
    * @param {Discord.Message} message The Message Sent by the User.
    * @param {Discord.Client} client The Discord Client.
    * @param {"en" | "ar" | "cn" | "de" | "es" | "fr" | "il" | "it" | "jp" | "kr" | "nl" | "pl" | "pt" | "ru" | "tr" | "id"} region (OPTIONAL): The Region/Language Code you want Akinator to Use. Defaults to "en".
    * @returns Discord.js Akinator Game
    * @async
    * @example
    *  const Discord = require("discord.js");
    *  const client = new Discord.Client();
    *  const akinator = require("discord.js-akinator");
    * 
    * const PREFIX = "!";
    * 
    * client.on("message", async message => {
    *     if(message.content.startsWith(`${PREFIX}akinator`)) {
    *         akinator(message, client)
    *     }
    * });
       */

module.exports = async function (message, client, region) {
    try {
        // error handling
        if (!message) return console.log("Discord.js Akinator Error: メッセージ引数がundefined(nullish)です'");
        if (!client) return console.log("Discord.js Akinator Error: Client引数がundefined(nullish)です");
        if (!region) region = "jp"
        if (!message.id || !message.channel || !message.channel.id || !message.author) throw new Error("メッセージ引数の値が間違っています")
        if (!client.user.id || !client.user) throw new Error("Client引数の値が間違っています")
        if (!message.guild) throw new Error("DMでは使えません")
       
        // defining for easy use
        let usertag = message.author.tag
        let avatar = message.author.displayAvatarURL()
        
        // check if a game is being hosted by the player
        if (games.has(message.author.id)) {
            let alreadyPlayingEmbed = new Discord.MessageEmbed()
                .setAuthor(usertag, avatar)
                .setTitle(`❌あなたはすでにゲームをプレイしています`)
                .setDescription("**あなたはすでにゲームが始まっています。`S`または`Stop`と投稿することで停止できます。**")
                .setColor("RED")

            return message.channel.send({ embed: alreadyPlayingEmbed })
        }
       
        // adding the player into the game
        games.add(message.author.id)

        let startingEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(`ゲームスタート中`)
            .setDescription("**あと3秒でゲームが始まります。**")
            .setColor("RANDOM")

        let startingMessage = await message.channel.send({ embed: startingEmbed })

        // starts the game
        let aki = new Aki(region)
        await aki.start();

        let notFinished = true;
        let stepsSinceLastGuess = 0;
        let hasGuessed = false;

        let noResEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(`ゲーム終了`)
            .setDescription(`**${message.author.username}、1分間操作がなかったためゲームが終了しました。**`)
            .setColor("RANDOM")

        let akiEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(`質問 ${aki.currentStep + 1}`)
            .setDescription(`**進行状況: 0%\n${aki.question}**`)
            .addField("送信してください", "**y** または **Yes**(はい)\n**n** または **No**(いいえ)\n**i** または **IDK**(わからない)\n**p** または **Probably**(たぶんそう/一部そう)\n**pn** または **Probably Not**(多分違う/一部違う)\n**b** または **Back**(戻る)")
            .setFooter(`「S」か「Stop」でゲーム終了`)
            .setColor("RANDOM")

        await startingMessage.delete();
        let akiMessage = await message.channel.send({ embed: akiEmbed });
         
        // if message was deleted, quit the player from the game
        client.on("messageDelete", async deletedMessage => {
            if (deletedMessage.id == akiMessage.id) {
                notFinished = false;
                games.delete(message.author.id)
                attemptingGuess.delete(message.guild.id)
                await aki.win()
                return;
            }
        })

        // repeat while the game is not finished
        while (notFinished) {
            if (!notFinished) return;

            stepsSinceLastGuess = stepsSinceLastGuess + 1

            if (((aki.progress >= 95 && (stepsSinceLastGuess >= 10 || hasGuessed == false)) || aki.currentStep >= 78) && (!attemptingGuess.has(message.guild.id))) {
                attemptingGuess.add(message.guild.id)
                await aki.win();

                stepsSinceLastGuess = 0;
                hasGuessed = true;

                let guessEmbed = new Discord.MessageEmbed()
                    .setAuthor(usertag, avatar)
                    .setTitle(`私は${Math.round(aki.progress)}%完了して考えたキャラクターは...`)
                    .setDescription(`**${aki.answers[0].name}**\n${aki.answers[0].description}\n\nこのキャラクターですか? **(y/Yes か n/No で回答)**`)
                    .addField("ランキング", `**${aki.answers[0].ranking}位**`, true)
                    .addField("質問数", `**${aki.currentStep}**`, true)
                    .setImage(aki.answers[0].absolute_picture_path)
                    .setColor("RANDOM")
                await akiMessage.edit({ embed: guessEmbed });

                // valid answers if the akinator sends the last question
                const guessFilter = x => {
                    return (x.author.id === message.author.id && ([
                        "y",
                        "yes",
                        "n",
                        "no"
                    ].includes(x.content.toLowerCase())));
                }

                await message.channel.awaitMessages(guessFilter, {
                    max: 1, time: 60000
                })
                    .then(async responses => {
                        if (!responses.size) {
                            return akiMessage.edit({ embed: noResEmbed });
                        }
                        const guessAnswer = String(responses.first()).toLowerCase();

                        await responses.first().delete();

                        attemptingGuess.delete(message.guild.id)

                        // if they answered yes
                        if (guessAnswer == "y" || guessAnswer == "yes") {
                            let finishedGameCorrect = new Discord.MessageEmbed()
                                .setAuthor(usertag, avatar)
                                .setTitle(`よくやった！`)
                                .setDescription(`**${message.author.username}、私はもう一度正しいと思いました！**`)
                                .addField("キャラクター", `**${aki.answers[0].name}**`, true)
                                .addField("ランキング", `**#${aki.answers[0].ranking}**`, true)
                                .addField("何番目の質問?", `**${aki.currentStep}**`, true)
                                .setColor("RANDOM")
                            await akiMessage.edit({ embed: finishedGameCorrect })
                            notFinished = false;
                            games.delete(message.author.id)
                            return;
                           
                        // otherwise
                        } else if (guessAnswer == "n" || guessAnswer == "no") {
                            if (aki.currentStep >= 78) {
                                let finishedGameDefeated = new Discord.MessageEmbed()
                                    .setAuthor(usertag, avatar)
                                    .setTitle(`よくやった！`)
                                    .setDescription(`**${message.author.username}、ブラボー！あなたに負けてしまった...**`)
                                    .setColor("RANDOM")
                                await akiMessage.edit({ embed: finishedGameDefeated })
                                notFinished = false;
                                games.delete(message.author.id)
                            } else {
                                aki.progress = 50
                            }
                        }
                    });
            }

            if (!notFinished) return;

            let updatedAkiEmbed = new Discord.MessageEmbed()
                .setAuthor(usertag, avatar)
                .setTitle(`質問${aki.currentStep + 1}`)
                .setDescription(`**進行状況${Math.round(aki.progress)}%\n${aki.question}**`)
                .addField("送信してください", "**y** または **Yes**(はい)\n**n** または **No**(いいえ)\n**i** または **IDK**(わからない)\n**p** または **Probably**(たぶんそう/一部そう)\n**pn** または **Probably Not**(多分違う/一部違う)\n**b** または **Back**(戻る)")
                .setFooter(`\`S\`または\`Stop\`でゲーム終了`)
                .setColor("RANDOM")
            akiMessage.edit({ embed: updatedAkiEmbed })

            // all valid answers when answering a regular akinator question
            const filter = x => {
                return (x.author.id === message.author.id && ([
                    "y",
                    "yes",
                    "n",
                    "no",
                    "i",
                    "idk",
                    "i",
                    "dont know",
                    "don't know",
                    "p",
                    "probably",
                    "pn",
                    "probably not",
                    "b",
                    "back",
                    "s",
                    "stop"
                ].includes(x.content.toLowerCase())));
            }

            await message.channel.awaitMessages(filter, {
                max: 1, time: 60000
            })
                .then(async responses => {
                    if (!responses.size) {
                        await aki.win()
                        notFinished = false;
                        games.delete(message.author.id)
                        return akiMessage.edit({ embed: noResEmbed })
                    }
                    const answer = String(responses.first()).toLowerCase().replace("'", "");

                    // assign points for the possible answers given
                    const answers = {
                        "y": 0,
                        "yes": 0,
                        "n": 1,
                        "no": 1,
                        "i": 2,
                        "idk": 2,
                        "dont know": 2,
                        "don't know": 2,
                        "i": 2,
                        "p": 3,
                        "probably": 3,
                        "pn": 4,
                        "probably not": 4,
                    }

                    let thinkingEmbed = new Discord.MessageEmbed()
                        .setAuthor(usertag, avatar)
                        .setTitle(`質問${aki.currentStep + 1}`)
                        .setDescription(`**進行状況: ${Math.round(aki.progress)}%\n${aki.question}**`)
                        .addField("送信してください", "**y** または **Yes**(はい)\n**n** または **No**(いいえ)\n**i** または **IDK**(わからない)\n**p** または **Probably**(たぶんそう/一部そう)\n**pn** または **Probably Not**(多分違う/一部違う)\n**b** または **Back**(戻る)")
                        .setFooter(`考え中です...少し待ってね`)
                        .setColor("RANDOM")
                    await akiMessage.edit({ embed: thinkingEmbed })

                    await responses.first().delete();

                    if (answer == "b" || answer == "back") {
                        if (aki.currentStep >= 1) {
                            await aki.back();
                        }
                       
                    // stop the game if the user selected to stop
                    } else if (answer == "s" || answer == "stop") {
                        games.delete(message.author.id)
                        let stopEmbed = new Discord.MessageEmbed()
                            .setAuthor(usertag, avatar)
                            .setTitle(`ゲーム終了`)
                            .setDescription(`**${message.author.username}、ゲームを終了しました！**`)
                            .setColor("RANDOM")
                        await aki.win()
                        await akiMessage.edit({ embed: stopEmbed })
                        notFinished = false;
                    } else {
                        await aki.step(answers[answer]);
                    }

                    if (!notFinished) return;
                });
        }
    } catch (e) {
        // log any errors that come
        attemptingGuess.delete(message.guild.id)
        games.delete(message.guild.id)
        if (e == "DiscordAPIError: Unknown Message") return;
        console.log(`Discord.js Akinator Error: ${e}`)
    }
}
